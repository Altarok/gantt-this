import { Plugin, TFile } from 'obsidian';

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
		this.registerMarkdownCodeBlockProcessor('fantasy-gantt', async (source, el, ctx) => {

			const currentFile = this.app.workspace.getActiveFile();
			if (!currentFile || !currentFile.parent) {
				el.createEl('pre', { text: 'Fehler: Konnte den aktuellen Dateiordner nicht ermitteln.' });
				return;
			}

			const mainWrapper = el.createDiv({ cls: 'fantasy-gantt-wrapper' });
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

			const chartContainer = mainWrapper.createDiv({ cls: 'gantt-chart-container' });

			// FIX: Build and append the tooltip directly to the document body so it never clips
			const tooltip = document.body.createDiv({ cls: 'gantt-tooltip', attr: { id: 'gantt-tooltip-element' } });
			tooltip.style.opacity = '0';
			tooltip.style.position = 'fixed'; // Use fixed positioning relative to viewport
			tooltip.style.zIndex = '9999';   // Stay above all panels

			const hoverTitle = tooltip.createDiv({ cls: 'tooltip-title' });
			const hoverDates = tooltip.createDiv({ cls: 'tooltip-dates' });
			const hoverLink = tooltip.createDiv({ cls: 'tooltip-link', text: 'Klicke um Notiz zu öffnen' });

			let data = this.getGanttDataFromFolder(currentFile.parent.path);

			const renderEngine = new GanttRenderEngine(chartContainer, data, tooltip, hoverTitle, hoverDates, hoverLink, this);

			toggleBars.addEventListener('change', (e) => renderEngine.updateSettings({ showBars: (e.target as HTMLInputElement).checked }));
			togglePoints.addEventListener('change', (e) => renderEngine.updateSettings({ showPoints: (e.target as HTMLInputElement).checked }));
			toggleGrouping.addEventListener('change', (e) => renderEngine.updateSettings({ enableGrouping: (e.target as HTMLInputElement).checked }));
			resetBtn.addEventListener('click', () => renderEngine.resetZoom());

			this.registerEvent(
				this.app.metadataCache.on('changed', (file) => {
					if (file.parent && file.parent.path === currentFile.parent?.path) {
						const updatedData = this.getGanttDataFromFolder(currentFile.parent.path);
						renderEngine.updateData(updatedData);
					}
				})
			);

			// Clean up the global tooltip when the user closes or switches the active note view
			ctx.onUnload(() => {
				tooltip.remove();
			});
		});
	}

	private getGanttDataFromFolder(folderPath: string): GanttItem[] {
		const items: GanttItem[] = [];
		let incrementalId = 1;

		const files = this.app.vault.getMarkdownFiles();
		const neighboringFiles = files.filter(f => f.parent && f.parent.path === folderPath);

		neighboringFiles.forEach(file => {
			const cache = this.app.metadataCache.getFileCache(file);
			const frontmatter = cache?.frontmatter;

			if (frontmatter && frontmatter['gantt-item'] === true) {
				items.push({
					id: incrementalId++,
					name: frontmatter['gantt-name'] || file.basename,
					startDay: Number(frontmatter['gantt-start'] ?? 0),
					endDay: Number(frontmatter['gantt-end'] ?? frontmatter['gantt-start'] ?? 0),
					group: frontmatter['gantt-group'] || 'Allgemein',
					type: frontmatter['gantt-type'] === 'point' ? 'point' : 'bar',
					color: frontmatter['gantt-color'] || undefined,
					link: file.path
				});
			}
		});

		return items;
	}
}

class GanttRenderEngine {
	private container: HTMLElement;
	private rawData: GanttItem[];
	private svg: SVGElement;
	private backgroundG: SVGElement;
	private chartArea: SVGElement;
	private axisArea: SVGElement;
	private dataG: SVGElement;
	private clipRect: SVGElement;

	private groups: any[] = [];
	private totalHeight = 400;
	private plugin: Plugin;
	private resizeObserver: ResizeObserver;

	private tooltip: HTMLElement;
	private hoverTitle: HTMLElement;
	private hoverDates: HTMLElement;
	private hoverLink: HTMLElement;

	private settings = { showBars: true, showPoints: true, enableGrouping: true };
	private config = { rowHeight: 35, groupHeaderHeight: 25, axisHeight: 50, margin: { top: 20, right: 0, bottom: 0, left: 0 } };

	private minDay = 0;
	private maxDay = 1000;
	private zoomScale = 1;
	private zoomTranslateX = 0;
	private isDragging = false;
	private startX = 0;
	private startTranslateX = 0;

	constructor(container: HTMLElement, rawData: GanttItem[], tooltip: HTMLElement, hoverTitle: HTMLElement, hoverDates: HTMLElement, hoverLink: HTMLElement, plugin: Plugin) {
		this.container = container;
		this.rawData = rawData;
		this.tooltip = tooltip;
		this.hoverTitle = hoverTitle;
		this.hoverDates = hoverDates;
		this.hoverLink = hoverLink;
		this.plugin = plugin;

		this.calculateTimeBounds();
		this.initLayout();
		this.initChartStructure();

		this.resizeObserver = new ResizeObserver(() => {
			this.handleResize();
		});
		this.resizeObserver.observe(this.container);
	}

	private calculateTimeBounds() {
		this.minDay = (Math.min(...this.rawData.map(d => d.startDay)) ?? 1000) - 30;
		this.maxDay = (Math.max(...this.rawData.map(d => Math.max(d.startDay, d.endDay ?? 0))) ?? 1050) + 30;
		if (this.rawData.length === 0) {
			this.minDay = 0;
			this.maxDay = 360;
		}
	}

	public updateData(newData: GanttItem[]) {
		this.rawData = newData;
		this.calculateTimeBounds();
		this.initLayout();
		this.initChartStructure();
		this.handleResize();
	}

	private createSVGElement(tag: string): SVGElement {
		return document.createElementNS('http://www.w3.org/2000/svg', tag);
	}

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
			const groupedMap = new Map<string, GanttItem[]>();
			activeData.forEach(item => {
				const gName = item.group || 'Allgemein';
				if (!groupedMap.has(gName)) groupedMap.set(gName, []);
				groupedMap.get(gName)?.push(item);
			});

			let currentYOffset = this.config.margin.top;
			groupedMap.forEach((items, groupName) => {
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

	private getXPosition(day: number, width: number): number {
		const renderWidth = width - this.config.margin.left - this.config.margin.right;
		const percentage = (day - this.minDay) / (this.maxDay - this.minDay);
		return (percentage * renderWidth * this.zoomScale) + this.zoomTranslateX;
	}

	initChartStructure() {
		this.container.innerHTML = '';

		this.svg = this.createSVGElement('svg');
		this.svg.setAttribute('width', '100%');
		this.svg.setAttribute('height', this.totalHeight.toString());
		this.svg.setAttribute('style', 'cursor: grab; display: block;');
		this.container.appendChild(this.svg);

		this.backgroundG = this.createSVGElement('g');
		this.svg.appendChild(this.backgroundG);

		this.chartArea = this.createSVGElement('g');
		this.chartArea.setAttribute('transform', `translate(${this.config.margin.left}, 0)`);
		this.svg.appendChild(this.chartArea);

		this.axisArea = this.createSVGElement('g');
		this.axisArea.setAttribute('transform', `translate(${this.config.margin.left}, ${this.totalHeight - this.config.axisHeight})`);
		this.svg.appendChild(this.axisArea);

		const defs = this.createSVGElement('defs');
		const clipPath = this.createSVGElement('clipPath');
		clipPath.setAttribute('id', 'gantt-clip');
		this.clipRect = this.createSVGElement('rect');
		this.clipRect.setAttribute('height', this.totalHeight.toString());
		clipPath.appendChild(this.clipRect);
		defs.appendChild(clipPath);
		this.svg.appendChild(defs);

		this.dataG = this.createSVGElement('g');
		this.dataG.setAttribute('clip-path', 'url(#gantt-clip)');
		this.chartArea.appendChild(this.dataG);

		this.setupNativeZoomAndPan();
		this.setupInteractions();
	}

	handleResize() {
		const width = this.container.clientWidth || 800;
		this.clipRect.setAttribute('width', (width - this.config.margin.left - this.config.margin.right).toString());

		this.drawGroupBackgrounds(width);
		this.renderData(width);
		this.drawAxes(width);
	}

	drawGroupBackgrounds(width: number) {
		this.backgroundG.innerHTML = '';

		this.groups.forEach((d, i) => {
			const groupG = this.createSVGElement('g');
			groupG.setAttribute('transform', `translate(0, ${d.yOffset})`);

			if (this.settings.enableGrouping) {
				const rect = this.createSVGElement('rect');
				rect.setAttribute('width', width.toString());
				rect.setAttribute('height', d.height.toString());
				rect.setAttribute('fill', 'var(--background-secondary)');
				rect.setAttribute('opacity', i % 2 === 0 ? '0.3' : '0.05');
				rect.setAttribute('style', 'pointer-events: none;');
				groupG.appendChild(rect);

				const textPaddingX = 10;
				const textWidthEstimate = d.name.length * 6.5 + (textPaddingX * 2);
				const badgeHeight = 18;

				const badge = this.createSVGElement('rect');
				badge.setAttribute('x', '10');
				badge.setAttribute('y', '5');
				badge.setAttribute('width', textWidthEstimate.toString());
				badge.setAttribute('height', badgeHeight.toString());
				badge.setAttribute('fill', 'var(--background-modifier-border)');
				badge.setAttribute('opacity', '0.6');
				badge.setAttribute('rx', (badgeHeight / 2).toString());
				badge.setAttribute('ry', (badgeHeight / 2).toString());
				badge.setAttribute('style', 'pointer-events: none;');
				groupG.appendChild(badge);

				const text = this.createSVGElement('text');
				text.setAttribute('x', (10 + textPaddingX).toString());
				text.setAttribute('y', '17');
				text.setAttribute('fill', 'var(--text-normal)');
				text.setAttribute('style', 'font-size: 10px; font-weight: 600; letter-spacing: 0.5px; pointer-events: none;');
				text.textContent = d.name.toUpperCase();
				groupG.appendChild(text);
			}
			this.backgroundG.appendChild(groupG);
		});
	}

	renderData(width: number) {
		this.dataG.innerHTML = '';

		this.groups.forEach(group => {
			const groupYStart = group.yOffset + (this.settings.enableGrouping ? this.config.groupHeaderHeight : 0);

			group.items.forEach((d: GanttItem) => {
				if (d.type === 'bar') {
					const x1 = this.getXPosition(d.startDay, width);
					const x2 = this.getXPosition(d.endDay, width);
					const barWidth = Math.max(2, x2 - x1);

					const rect = this.createSVGElement('rect');
					rect.setAttribute('class', 'gantt-item bar-rect');
					rect.setAttribute('x', x1.toString());
					rect.setAttribute('y', (groupYStart + d.lane! * this.config.rowHeight + 4).toString());
					rect.setAttribute('width', barWidth.toString());
					rect.setAttribute('height', (this.config.rowHeight - 8).toString());
					rect.setAttribute('fill', d.color || 'var(--interactive-accent)');
					rect.setAttribute('rx', '4');
					rect.setAttribute('ry', '4');
					rect.setAttribute('data-id', d.id.toString());
					rect.setAttribute('style', 'cursor: pointer;');
					this.dataG.appendChild(rect);
				} else if (d.type === 'point') {
					const cx = this.getXPosition(d.startDay, width);

					const circle = this.createSVGElement('circle');
					circle.setAttribute('class', 'gantt-item point-circle');
					circle.setAttribute('cx', cx.toString());
					circle.setAttribute('cy', (groupYStart + d.lane! * this.config.rowHeight + this.config.rowHeight / 2).toString());
					circle.setAttribute('r', '7');
					circle.setAttribute('fill', d.color || 'var(--text-accent)');
					circle.setAttribute('data-id', d.id.toString());
					circle.setAttribute('style', 'cursor: pointer;');
					this.dataG.appendChild(circle);
				}
			});
		});
	}

	drawAxes(width: number) {
		this.axisArea.innerHTML = '';
		const renderWidth = width - this.config.margin.left - this.config.margin.right;

		const baseline = this.createSVGElement('line');
		baseline.setAttribute('x1', '0');
		baseline.setAttribute('x2', renderWidth.toString());
		baseline.setAttribute('y1', '0');
		baseline.setAttribute('y2', '0');
		baseline.setAttribute('stroke', 'var(--background-modifier-border)');
		this.axisArea.appendChild(baseline);

		const totalDaysSpan = (this.maxDay - this.minDay) / this.zoomScale;
		let tickSpacing = 50;
		if (totalDaysSpan > 2000) tickSpacing = 500;
		else if (totalDaysSpan > 1000) tickSpacing = 200;
		else if (totalDaysSpan > 500) tickSpacing = 100;
		else if (totalDaysSpan < 100) tickSpacing = 10;
		else if (totalDaysSpan < 30) tickSpacing = 5;

		const minorTickSpacing = tickSpacing / 5;

		const startDay = Math.floor(this.minDay / tickSpacing) * tickSpacing - tickSpacing;
		const endDay = Math.ceil(this.maxDay / tickSpacing) * tickSpacing + tickSpacing;

		for (let day = startDay; day <= endDay; day += minorTickSpacing) {
			const xPos = this.getXPosition(day, width);
			if (xPos < 0 || xPos > renderWidth) continue;

			const isMajorTick = Math.abs(day % tickSpacing) < 0.001;

			if (isMajorTick) {
				const gridLine = this.createSVGElement('line');
				gridLine.setAttribute('x1', xPos.toString());
				gridLine.setAttribute('x2', xPos.toString());
				gridLine.setAttribute('y1', `-${this.totalHeight - this.config.axisHeight}`);
				gridLine.setAttribute('y2', '0');
				gridLine.setAttribute('stroke', 'var(--background-modifier-border)');
				gridLine.setAttribute('stroke-width', '1');
				gridLine.setAttribute('stroke-dasharray', '4 4');
				gridLine.setAttribute('opacity', '0.4');
				gridLine.setAttribute('style', 'pointer-events: none;');
				this.axisArea.appendChild(gridLine);

				const tick = this.createSVGElement('line');
				tick.setAttribute('x1', xPos.toString());
				tick.setAttribute('x2', xPos.toString());
				tick.setAttribute('y1', '0');
				tick.setAttribute('y2', '6');
				tick.setAttribute('stroke', 'var(--text-muted)');
				this.axisArea.appendChild(tick);

				const text = this.createSVGElement('text');
				text.setAttribute('x', xPos.toString());
				text.setAttribute('y', '24');
				text.setAttribute('text-anchor', 'middle');
				text.setAttribute('fill', 'var(--text-muted)');
				text.setAttribute('style', 'font-size: 11px; user-select: none; font-weight: 500;');
				text.textContent = `Tag ${day}`;
				this.axisArea.appendChild(text);
			} else {
				const minorTick = this.createSVGElement('line');
				minorTick.setAttribute('x1', xPos.toString());
				minorTick.setAttribute('x2', xPos.toString());
				minorTick.setAttribute('y1', '0');
				minorTick.setAttribute('y2', '4');
				minorTick.setAttribute('stroke', 'var(--text-muted)');
				minorTick.setAttribute('stroke-width', '1');
				minorTick.setAttribute('opacity', '0.7');
				this.axisArea.appendChild(minorTick);
			}
		}
	}

	setupNativeZoomAndPan() {
		this.svg.addEventListener('mousedown', (e: MouseEvent) => {
			if ((e.target as HTMLElement).classList.contains('gantt-item')) return;
			this.isDragging = true;
			this.svg.setAttribute('style', 'cursor: grabbing; display: block;');
			this.startX = e.clientX;
			this.startTranslateX = this.zoomTranslateX;
		});

		window.addEventListener('mousemove', (e: MouseEvent) => {
			if (!this.isDragging) return;
			const width = this.container.clientWidth || 800;
			const deltaX = e.clientX - this.startX;
			this.zoomTranslateX = this.startTranslateX + deltaX;
			this.renderData(width);
			this.drawAxes(width);
		});

		window.addEventListener('mouseup', () => {
			if (this.isDragging) {
				this.isDragging = false;
				this.svg.setAttribute('style', 'cursor: grab; display: block;');
			}
		});

		this.svg.addEventListener('wheel', (e: WheelEvent) => {
			e.preventDefault();
			const width = this.container.clientWidth || 800;
			const rect = this.svg.getBoundingClientRect();
			const mouseX = e.clientX - rect.left - this.config.margin.left;

			const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
			const nextScale = Math.min(50, Math.max(0.1, this.zoomScale * zoomFactor));

			this.zoomTranslateX = mouseX - (mouseX - this.zoomTranslateX) * (nextScale / this.zoomScale);
			this.zoomScale = nextScale;

			this.renderData(width);
			this.drawAxes(width);
		}, { passive: false });
	}

	resetZoom() {
		this.zoomScale = 1;
		this.zoomTranslateX = 0;
		this.handleResize();
	}

	updateSettings(newSettings: any) {
		this.settings = { ...this.settings, ...newSettings };
		this.initLayout();
		this.initChartStructure();
		this.handleResize();
	}

	setupInteractions() {
		const showTooltip = (event: MouseEvent, d: GanttItem) => {
			this.tooltip.style.opacity = '1';

			// FIX: Position tracking directly using viewport client coordinates
			this.tooltip.style.left = `${event.clientX + 15}px`;
			this.tooltip.style.top = `${event.clientY + 15}px`;

			this.hoverTitle.textContent = d.name;
			this.hoverDates.textContent = d.type === 'bar' ? `${CalendarUtils.formatLong(d.startDay)} - ${CalendarUtils.formatLong(d.endDay)}` : CalendarUtils.formatLong(d.startDay);
			this.hoverLink.style.display = d.link ? 'block' : 'none';
		};

		this.svg.addEventListener('mouseover', (event) => {
			const target = event.target as HTMLElement;
			if (target && target.classList.contains('gantt-item')) {
				const id = parseInt(target.getAttribute('data-id') || '');
				const dataObj = this.rawData.find(d => d.id === id);
				if (dataObj) showTooltip(event, dataObj);
			}
		});

		this.svg.addEventListener('mousemove', (event) => {
			const target = event.target as HTMLElement;
			if (target && target.classList.contains('gantt-item')) {
				if (this.tooltip.style.opacity !== '1') {
					const id = parseInt(target.getAttribute('data-id') || '');
					const dataObj = this.rawData.find(d => d.id === id);
					if (dataObj) showTooltip(event, dataObj);
				}
				// FIX: Simplified viewport tracking math
				this.tooltip.style.left = `${event.clientX + 15}px`;
				this.tooltip.style.top = `${event.clientY + 15}px`;
			} else {
				this.tooltip.style.opacity = '0';
			}
		});

		this.svg.addEventListener('mouseleave', () => {
			this.tooltip.style.opacity = '0';
		});

		this.svg.addEventListener('click', (event) => {
			const target = event.target as HTMLElement;
			if (target && target.classList.contains('gantt-item')) {
				const id = parseInt(target.getAttribute('data-id') || '');
				const dataObj = this.rawData.find(d => d.id === id);
				if (dataObj && dataObj.link) {
					this.plugin.app.workspace.openLinkText(dataObj.link, '', true);
				}
			}
		});
	}
}
