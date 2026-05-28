import { Plugin } from 'obsidian';
import * as d3 from 'd3';

interface GanttItem {
	id: number;
	name: string;
	startDay: number;
	endDay: number;
	group: string;
	type: 'bar' | 'point';
	color?: string;
	link?: string;
	lane?: number;
}

const calendarConfig = { daysInMonth: 30, monthsInYear: 12, daysInYear: 360 };

class CalendarUtils {
	static daysToDate(totalDays: number) {
		const year = Math.floor(totalDays / calendarConfig.daysInYear);
		const remainder = totalDays % calendarConfig.daysInYear;
		const month = Math.floor(remainder / calendarConfig.daysInMonth) + 1;
		const day = (remainder % calendarConfig.daysInMonth) + 1;
		return { year, month, day };
	}
	static formatLong(totalDays: number) {
		const d = this.daysToDate(totalDays);
		return `Tag ${d.day}, Mon. ${d.month}, Jahr ${d.year}`;
	}
}

export default class FantasyGanttPlugin extends Plugin {

	async onload() {
		this.registerMarkdownCodeBlockProcessor('fantasy-gantt', (source, el, ctx) => {
			let data: GanttItem[] = [];
			try {
				data = JSON.parse(source);
			} catch (e) {
				el.createEl('pre', { text: 'Fehler beim Parsen der Gantt-Daten (Ungültiges JSON)' + e });
				return;
			}

			// Create main container structure safely within the Obsidian theme
			const mainWrapper = el.createDiv({ cls: 'fantasy-gantt-wrapper' });

			// Create Toolbar
			const toolbar = mainWrapper.createDiv({ cls: 'gantt-toolbar' });

			const createCheckbox = (label: string, id: string, checked = true) => {
				const lbl = toolbar.createEl('label', { cls: 'gantt-input-label' });
				const input = lbl.createEl('input', { attr: { type: 'checkbox', id } });
				input.checked = checked;
				lbl.createEl('span', { text: ` ${label}` });
				return input;
			};

			const toggleBars = createCheckbox('Balken zeigen', 'toggle-bars');
			const togglePoints = createCheckbox('Punkte zeigen', 'toggle-points');
			const toggleGrouping = createCheckbox('Gruppieren', 'toggle-grouping');
			const resetBtn = toolbar.createEl('button', { text: 'Zoom Reset', cls: 'gantt-btn' });

			// Chart Render Container
			const chartContainer = mainWrapper.createDiv({ cls: 'gantt-chart-container' });

			// Tooltip Element (Appended to the specific wrapper instance to avoid leakages)
			const tooltip = mainWrapper.createDiv({ cls: 'gantt-tooltip', attr: { id: 'gantt-tooltip-element' } });
			tooltip.style.opacity = '0';
			tooltip.style.position = 'absolute';
			tooltip.style.zIndex = '1000';

			const hoverTitle = tooltip.createDiv({ cls: 'tooltip-title' });
			const hoverDates = tooltip.createDiv({ cls: 'tooltip-dates' });
			const hoverLink = tooltip.createDiv({ cls: 'tooltip-link', text: 'Klicke um Notiz zu öffnen' });

			// Instantiate chart renderer logic mapping onto Obsidian internals
			const renderEngine = new GanttRenderEngine(chartContainer, data, tooltip, hoverTitle, hoverDates, hoverLink, this);

			// Bind UI Events
			toggleBars.addEventListener('change', (e) => renderEngine.updateSettings({ showBars: (e.target as HTMLInputElement).checked }));
			togglePoints.addEventListener('change', (e) => renderEngine.updateSettings({ showPoints: (e.target as HTMLInputElement).checked }));
			toggleGrouping.addEventListener('change', (e) => renderEngine.updateSettings({ enableGrouping: (e.target as HTMLInputElement).checked }));
			resetBtn.addEventListener('click', () => renderEngine.resetZoom());
		});
	}
}

class GanttRenderEngine {
	// Ported architecture from your prototype script
	private container: HTMLElement;
	private rawData: GanttItem[];
	private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
	private chartArea: d3.Selection<SVGGElement, unknown, null, undefined>;
	private axisArea: d3.Selection<SVGGElement, unknown, null, undefined>;
	private dataG: d3.Selection<SVGGElement, unknown, null, undefined>;
	private xScale: d3.ScaleLinear<number, number>;
	private originalXScale: d3.ScaleLinear<number, number>;
	private zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown>;
	private groups: any[] = [];
	private totalHeight = 400;
	private plugin: Plugin;

	private tooltip: HTMLElement;
	private hoverTitle: HTMLElement;
	private hoverDates: HTMLElement;
	private hoverLink: HTMLElement;

	private settings = { showBars: true, showPoints: true, enableGrouping: true };
	private config = { rowHeight: 35, groupHeaderHeight: 25, axisHeight: 50, margin: { top: 20, right: 20, bottom: 0, left: 120 } };

	constructor(container: HTMLElement, rawData: GanttItem[], tooltip: HTMLElement, hoverTitle: HTMLElement, hoverDates: HTMLElement, hoverLink: HTMLElement, plugin: Plugin) {
		this.container = container;
		this.rawData = rawData;
		this.tooltip = tooltip;
		this.hoverTitle = hoverTitle;
		this.hoverDates = hoverDates;
		this.hoverLink = hoverLink;
		this.plugin = plugin;

		this.initLayout();
		this.initChart();
	}

	// Lane stacking logic from prototype
	private calculateStacking(items: GanttItem[]) {
		const sorted = [...items].sort((a, b) => a.startDay - b.startDay);
		const lanes: GanttItem[][] = [];
		sorted.forEach(item => {
			let placed = false;
			for (let i = 0; i < lanes.length; i++) {
				const lastItem = lanes[i][lanes[i].length - 1];
				if (lastItem.endDay < item.startDay - 1) {
					lanes[i].push(item);
					item.lane = i;
					placed = true;
					break;
				}
			}
			if (!placed) {
				lanes.push([item]);
				item.lane = lanes.length - 1;
			}
		});
		return { processedData: sorted, totalLanes: lanes.length };
	}

	initLayout() {
		let activeData: GanttItem[] = [];
		if (this.settings.showBars) activeData = activeData.concat(this.rawData.filter(d => d.type === 'bar' && d.startDay !== d.endDay));
		if (this.settings.showPoints) activeData = activeData.concat(this.rawData.filter(d => d.type === 'point' || d.startDay === d.endDay));

		this.groups = [];
		if (this.settings.enableGrouping) {
			const grouped = d3.group(activeData, d => d.group || 'Allgemein');
			let currentYOffset = this.config.margin.top;

			grouped.forEach((items, groupName) => {
				const { processedData, totalLanes } = this.calculateStacking(items);
				const groupHeight = Math.max(1, totalLanes) * this.config.rowHeight + this.config.groupHeaderHeight;
				this.groups.push({ name: groupName, items: processedData, yOffset: currentYOffset, height: groupHeight, lanes: totalLanes });
				currentYOffset += groupHeight;
			});
			this.totalHeight = currentYOffset + this.config.axisHeight;
		} else {
			const { processedData, totalLanes } = this.calculateStacking(activeData);
			const groupHeight = Math.max(1, totalLanes) * this.config.rowHeight;
			this.groups.push({ name: 'Alle', items: processedData, yOffset: this.config.margin.top, height: groupHeight, lanes: totalLanes });
			this.totalHeight = this.config.margin.top + groupHeight + this.config.axisHeight;
		}
		this.container.style.height = `${this.totalHeight}px`;
	}

	initChart() {
		this.container.innerHTML = '';
		const width = this.container.clientWidth || 800;

		this.svg = d3.select(this.container).append('svg')
			.attr('width', width)
			.attr('height', this.totalHeight)
			.attr('style', 'cursor: grab;');

		this.chartArea = this.svg.append('g').attr('transform', `translate(${this.config.margin.left}, 0)`);
		this.axisArea = this.svg.append('g').attr('transform', `translate(${this.config.margin.left}, ${this.totalHeight - this.config.axisHeight})`);

		const minDay = (d3.min(this.rawData, d => d.startDay) ?? 1000) - 30;
		const maxDay = (d3.max(this.rawData, d => Math.max(d.startDay, d.endDay ?? 0)) ?? 1050) + 30;

		this.xScale = d3.scaleLinear().domain([minDay, maxDay]).range([0, width - this.config.margin.left - this.config.margin.right]);
		this.originalXScale = this.xScale.copy();

		this.svg.append('defs').append('clipPath')
			.attr('id', 'gantt-clip')
			.append('rect')
			.attr('width', width - this.config.margin.left - this.config.margin.right)
			.attr('height', this.totalHeight);

		this.drawGroups(width);
		this.setupZoom();
		this.setupInteractions();
	}

	drawGroups(width: number) {
		const groupContainers = this.svg.selectAll('.group-container')
			.data(this.groups)
			.enter().append('g')
			.attr('transform', d => `translate(0, ${d.yOffset})`);

		if (this.settings.enableGrouping) {
			groupContainers.append('rect')
				.attr('width', width)
				.attr('height', d => d.height)
				.attr('fill', 'var(--background-secondary)')
				.attr('opacity', (d, i) => i % 2 === 0 ? 0.4 : 0.1);

			groupContainers.append('text')
				.attr('x', 10)
				.attr('y', 20)
				.attr('fill', 'var(--text-muted)')
				.style('font-size', '12px')
				.style('font-weight', 'bold')
				.text(d => d.name);
		}

		this.dataG = this.chartArea.append('g').attr('clip-path', 'url(#gantt-clip)');
		this.renderData(this.xScale);
		this.drawAxes(this.xScale, width);
	}

	renderData(currentXScale: d3.ScaleLinear<number, number>) {
		this.dataG.selectAll('*').remove();

		this.groups.forEach(group => {
			const groupYStart = group.yOffset + (this.settings.enableGrouping ? this.config.groupHeaderHeight : 0);
			const bars = group.items.filter((d: GanttItem) => d.type === 'bar');
			const points = group.items.filter((d: GanttItem) => d.type === 'point');

			// Draw Bars
			this.dataG.selectAll(`.bar-${group.name}`)
				.data(bars).enter().append('rect')
				.attr('class', 'gantt-item bar-rect')
				.attr('x', (d: any) => currentXScale(d.startDay))
				.attr('y', (d: any) => groupYStart + d.lane * this.config.rowHeight + 4)
				.attr('width', (d: any) => Math.max(2, currentXScale(d.endDay) - currentXScale(d.startDay)))
				.attr('height', this.config.rowHeight - 8)
				.attr('fill', (d: any) => d.color || 'var(--interactive-accent)')
				.attr('rx', 4).attr('ry', 4)
				.attr('data-id', (d: any) => d.id)
				.style('cursor', 'pointer');

			// Draw Points
			this.dataG.selectAll(`.point-${group.name}`)
				.data(points).enter().append('circle')
				.attr('class', 'gantt-item point-circle')
				.attr('cx', (d: any) => currentXScale(d.startDay))
				.attr('cy', (d: any) => groupYStart + d.lane * this.config.rowHeight + this.config.rowHeight / 2)
				.attr('r', 7)
				.attr('fill', (d: any) => d.color || 'var(--text-accent)')
				.attr('data-id', (d: any) => d.id)
				.style('cursor', 'pointer');
		});
	}

	drawAxes(currentXScale: d3.ScaleLinear<number, number>, width: number) {
		this.axisArea.selectAll('*').remove();
		const renderWidth = width - this.config.margin.left - this.config.margin.right;

		// Quick native fallback generation logic for axis rule lines matching your AxisGenerator
		this.axisArea.append('line').attr('x1', 0).attr('x2', renderWidth).attr('y1', 0).attr('y2', 0).attr('stroke', 'var(--background-modifier-border)');

		const axis = d3.axisBottom(currentXScale).ticks(5).tickFormat(d => `Tag ${d}`);
		this.axisArea.call(axis);
		this.axisArea.selectAll('text').attr('fill', 'var(--text-muted)');
		this.axisArea.selectAll('line').attr('stroke', 'var(--background-modifier-border)');
	}

	setupZoom() {
		this.zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.1, 50])
			.on('zoom', (event) => {
				const newXScale = event.transform.rescaleX(this.originalXScale);
				this.renderData(newXScale);
				this.drawAxes(newXScale, this.container.clientWidth);
			});
		this.svg.call(this.zoomBehavior);
	}

	resetZoom() {
		this.svg.transition().duration(750).call(this.zoomBehavior.transform, d3.zoomIdentity);
	}

	updateSettings(newSettings: any) {
		this.settings = { ...this.settings, ...newSettings };
		this.initLayout();
		this.initChart();
	}

	setupInteractions() {
		const showTooltip = (event: MouseEvent, d: GanttItem) => {
			this.tooltip.style.opacity = '1';
			// Coordinate transformation safely anchored inside note container bounding box context
			const bounding = this.container.getBoundingClientRect();
			this.tooltip.style.left = `${event.clientX - bounding.left + 15}px`;
			this.tooltip.style.top = `${event.clientY - bounding.top + 15}px`;

			this.hoverTitle.textContent = d.name;
			this.hoverDates.textContent = d.type === 'bar' ? `${CalendarUtils.formatLong(d.startDay)} - ${CalendarUtils.formatLong(d.endDay)}` : CalendarUtils.formatLong(d.startDay);
			this.hoverLink.style.display = d.link ? 'block' : 'none';
		};

		this.svg.on('mouseover', (event) => {
			if (event.target.classList.contains('gantt-item')) {
				const id = parseInt(event.target.getAttribute('data-id'));
				const dataObj = this.rawData.find(d => d.id === id);
				if (dataObj) showTooltip(event, dataObj);
			}
		}).on('mousemove', (event) => {
			if (this.tooltip.style.opacity === '1') {
				const bounding = this.container.getBoundingClientRect();
				this.tooltip.style.left = `${event.clientX - bounding.left + 15}px`;
				this.tooltip.style.top = `${event.clientY - bounding.top + 15}px`;
			}
		}).on('mouseleave', () => {
			this.tooltip.style.opacity = '0';
		}).on('click', (event) => {
			if (event.target.classList.contains('gantt-item')) {
				const id = parseInt(event.target.getAttribute('data-id'));
				const dataObj = this.rawData.find(d => d.id === id);
				// Execute standard Obsidian open link routing framework via the Workspace API
				if (dataObj && dataObj.link) {
					this.plugin.app.workspace.openLinkText(dataObj.link, '', true);
				}
			}
		});
	}
}
