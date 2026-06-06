import { Plugin } from 'obsidian';

interface GanttItem {
  id: number;
  name: string;
  startDate: Date;
  endDate: Date;
  startMs: number; // Stored as milliseconds for easier math/sorting
  endMs: number;
  group: string;
  type: 'bar' | 'point';
  color?: string;
  link?: string;
  lane?: number;
}

interface GanttGroup {
  name: string;
  items: GanttItem[];
  yOffset: number;
  height: number;
  lanes: number;
}

export default class FantasyGanttPlugin extends Plugin {
  async onload() {
    this.registerMarkdownCodeBlockProcessor('fantasy-gantt', async (source, el, ctx) => {
      const currentFile = this.app.workspace.getActiveFile();
      if (!currentFile || !currentFile.parent) {
        el.createEl('pre', { text: 'Fehler: Konnte den aktuellen Dateiordner nicht ermitteln.' });
        return;
      }

      let targetFolderPath = currentFile.parent.path;
      const lines = source.split('\n');
      for (const line of lines) {
        const match = line.match(/^path:\s*(.+)$/i);
        if (match) {
          const pathValue = match[1].trim().toLowerCase();
          if (pathValue === 'root') {
            targetFolderPath = '/';
          } else if (pathValue === 'local') {
            targetFolderPath = currentFile.parent.path;
          } else {
            targetFolderPath = match[1].trim();
          }
          break;
        }
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
      const tooltip = document.body.createDiv({ cls: 'gantt-tooltip', attr: { id: 'gantt-tooltip-element' } });

      const hoverTitle = tooltip.createDiv({ cls: 'tooltip-title' });
      const hoverDates = tooltip.createDiv({ cls: 'tooltip-dates' });
      const hoverLink = tooltip.createDiv({ cls: 'tooltip-link', text: 'Klicke um Notiz zu öffnen' });

      let data = this.getGanttDataFromFolder(targetFolderPath);

      const renderEngine = new GanttRenderEngine(
        chartContainer,
        data,
        tooltip,
        hoverTitle,
        hoverDates,
        hoverLink,
        this
      );

      toggleBars.addEventListener('change', (e) => renderEngine.updateSettings({ showBars: (e.target as HTMLInputElement).checked }));
      togglePoints.addEventListener('change', (e) => renderEngine.updateSettings({ showPoints: (e.target as HTMLInputElement).checked }));
      toggleGrouping.addEventListener('change', (e) => renderEngine.updateSettings({ enableGrouping: (e.target as HTMLInputElement).checked }));
      resetBtn.addEventListener('click', () => renderEngine.resetZoom());

      this.registerEvent(
        this.app.metadataCache.on('changed', (file) => {
          const fileInTargetScope = targetFolderPath === '/' || (file.parent && file.parent.path === targetFolderPath);
          if (fileInTargetScope) {
            const updatedData = this.getGanttDataFromFolder(targetFolderPath);
            renderEngine.updateData(updatedData);
          }
        })
      );

      ctx.onUnload(() => {
        tooltip.remove();
      });
    });
  }

  private getGanttDataFromFolder(folderPath: string): GanttItem[] {
    const items: GanttItem[] = [];
    let incrementalId = 1;
    const files = this.app.vault.getMarkdownFiles();

    const targetFiles = files.filter(f => {
      if (!f.parent) return false;
      if (folderPath === '/') return true;
      return f.parent.path === folderPath;
    });

    targetFiles.forEach(file => {
      const cache = this.app.metadataCache.getFileCache(file);
      const frontmatter = cache?.frontmatter;

      if (frontmatter && frontmatter['gantt-item'] === true) {
        const startInput = frontmatter['gantt-start'];
        const endInput = frontmatter['gantt-end'];

        if (!startInput) return;

        const startDate = new Date(startInput);
        // Fallback to start date if no end date provided or if format is invalid
        const endDate = endInput ? new Date(endInput) : new Date(startDate);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return; // Skip rendering items with completely invalid ISO stamps
        }

        items.push({
          id: incrementalId++,
          name: frontmatter['gantt-name'] || file.basename,
          startDate: startDate,
          endDate: endDate,
          startMs: startDate.getTime(),
          endMs: endDate.getTime(),
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

  private groups: GanttGroup[] = [];
  private totalHeight = 400;
  private plugin: Plugin;
  private resizeObserver: ResizeObserver;

  private tooltip: HTMLElement;
  private hoverTitle: HTMLElement;
  private hoverDates: HTMLElement;
  private hoverLink: HTMLElement;

  private settings = { showBars: true, showPoints: true, enableGrouping: true };
  private config = {
    rowHeight: 24,
    groupHeaderHeight: 25,
    axisHeight: 50,
    margin: { top: 20, right: 0, bottom: 0, left: 0 }
  };

  private minMs = 0;
  private maxMs = 0;
  private zoomScale = 1;
  private zoomTranslateX = 0;
  private isDragging = false;
  private startX = 0;
  private startTranslateX = 0;

  constructor(
    container: HTMLElement,
    rawData: GanttItem[],
    tooltip: HTMLElement,
    hoverTitle: HTMLElement,
    hoverDates: HTMLElement,
    hoverLink: HTMLElement,
    plugin: Plugin
  ) {
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
    if (this.rawData.length === 0) {
      const now = new Date().getTime();
      this.minMs = now - 15 * 24 * 60 * 60 * 1000;
      this.maxMs = now + 15 * 24 * 60 * 60 * 1000;
      return;
    }

    const startValues = this.rawData.map(d => d.startMs);
    const endValues = this.rawData.map(d => Math.max(d.startMs, d.endMs));

    const absoluteMin = Math.min(...startValues);
    const absoluteMax = Math.max(...endValues);

    // Padding bounds by 15 days on each end
    const paddingMs = 15 * 24 * 60 * 60 * 1000;
    this.minMs = absoluteMin - paddingMs;
    this.maxMs = absoluteMax + paddingMs;
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
    const sorted = [...items].sort((a, b) => a.startMs - b.startMs);
    const lanes: GanttItem[][] = [];
    sorted.forEach(item => {
      let placed = false;
      for (let i = 0; i < lanes.length; i++) {
        const lastItem = lanes[i][lanes[i].length - 1];
        // 1 day buffer in milliseconds
        const dayBufferMs = 24 * 60 * 60 * 1000;
        if (lastItem.endMs < item.startMs - dayBufferMs) {
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
    if (this.settings.showBars) activeData = activeData.concat(this.rawData.filter(d => d.type === 'bar' && d.startMs !== d.endMs));
    if (this.settings.showPoints) activeData = activeData.concat(this.rawData.filter(d => d.type === 'point' || d.startMs === d.endMs));

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
        this.groups.push({
          name: groupName,
          items: processedData,
          yOffset: currentYOffset,
          height: groupHeight,
          lanes: totalLanes
        });
        currentYOffset += groupHeight;
      });
      this.totalHeight = currentYOffset + this.config.axisHeight;
    } else {
      const { processedData, totalLanes } = this.calculateStacking(activeData);
      const groupHeight = Math.max(1, totalLanes) * this.config.rowHeight;
      this.groups.push({
        name: 'Alle',
        items: processedData,
        yOffset: this.config.margin.top,
        height: groupHeight,
        lanes: totalLanes
      });
      this.totalHeight = this.config.margin.top + groupHeight + this.config.axisHeight;
    }
    this.container.style.height = `${this.totalHeight}px`;
  }

  private getXPosition(ms: number, width: number): number {
    const renderWidth = width - this.config.margin.left - this.config.margin.right;
    const percentage = (ms - this.minMs) / (this.maxMs - this.minMs);
    return (percentage * renderWidth * this.zoomScale) + this.zoomTranslateX;
  }

  initChartStructure() {
    this.container.innerHTML = '';

    this.svg = this.createSVGElement('svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', this.totalHeight.toString());
    this.svg.setAttribute('class', 'gantt-svg-canvas');
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
        rect.setAttribute('class', i % 2 === 0 ? 'gantt-group-row-even' : 'gantt-group-row-odd');
        groupG.appendChild(rect);

        const text = this.createSVGElement('text');
        text.setAttribute('x', '20');
        text.setAttribute('y', '17');
        text.setAttribute('class', 'gantt-group-text');
        text.textContent = d.name.toUpperCase();

        groupG.appendChild(text);

        const computedLength = (text as any).getComputedTextLength ? (text as any).getComputedTextLength() : 0;
        const textWidthEstimate = computedLength > 0 ? computedLength : d.name.length * 6.5;
        const badgeWidth = textWidthEstimate + 20;
        const badgeHeight = 18;

        const shadowRect = this.createSVGElement('rect');
        shadowRect.setAttribute('x', '10');
        shadowRect.setAttribute('y', (5 + badgeHeight).toString());
        shadowRect.setAttribute('width', badgeWidth.toString());
        shadowRect.setAttribute('height', '4');
        shadowRect.setAttribute('class', 'gantt-group-shadow');

        const badge = this.createSVGElement('rect');
        badge.setAttribute('x', '10');
        badge.setAttribute('y', '5');
        badge.setAttribute('width', badgeWidth.toString());
        badge.setAttribute('height', badgeHeight.toString());
        badge.setAttribute('rx', (badgeHeight / 2).toString());
        badge.setAttribute('ry', (badgeHeight / 2).toString());
        badge.setAttribute('class', 'gantt-group-badge');

        groupG.insertBefore(shadowRect, text);
        groupG.insertBefore(badge, text);
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
          const x1 = this.getXPosition(d.startMs, width);
          const x2 = this.getXPosition(d.endMs, width);
          const barWidth = Math.max(2, x2 - x1);

          const rect = this.createSVGElement('rect');
          rect.setAttribute('class', 'gantt-item bar-rect');
          rect.setAttribute('x', x1.toString());
          rect.setAttribute('y', (groupYStart + d.lane! * this.config.rowHeight + 4).toString());
          rect.setAttribute('width', barWidth.toString());
          rect.setAttribute('height', (this.config.rowHeight - 8).toString());
          if (d.color) rect.setAttribute('fill', d.color);
          rect.setAttribute('data-id', d.id.toString());
          this.dataG.appendChild(rect);
        } else if (d.type === 'point') {
          const cx = this.getXPosition(d.startMs, width);

          const circle = this.createSVGElement('circle');
          circle.setAttribute('class', 'gantt-item point-circle');
          circle.setAttribute('cx', cx.toString());
          circle.setAttribute('cy', (groupYStart + d.lane! * this.config.rowHeight + this.config.rowHeight / 2).toString());
          circle.setAttribute('r', '6');
          if (d.color) circle.setAttribute('fill', d.color);
          circle.setAttribute('data-id', d.id.toString());
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
    baseline.setAttribute('class', 'gantt-axis-baseline');
    this.axisArea.appendChild(baseline);

    const totalDaysSpan = (this.maxMs - this.minMs) / (24 * 60 * 60 * 1000) / this.zoomScale;

    // Determine intervals dynamically based on viewport day span
    let stepDays = 1;
    if (totalDaysSpan > 365 * 3) stepDays = 365;      // Years
    else if (totalDaysSpan > 365) stepDays = 90;     // Quarters
    else if (totalDaysSpan > 60) stepDays = 30;      // Months
    else if (totalDaysSpan > 20) stepDays = 7;       // Weeks
    else if (totalDaysSpan > 5) stepDays = 2;

    const msPerDay = 24 * 60 * 60 * 1000;
    const stepMs = stepDays * msPerDay;

    // Find a clean starting timestamp matching the interval bounds
    const startMsValue = Math.floor(this.minMs / stepMs) * stepMs - stepMs;
    const endMsValue = Math.ceil(this.maxMs / stepMs) * stepMs + stepMs;

    // Draw minor daily tick-lines under dense views
    if (totalDaysSpan < 60 && stepDays > 1) {
      for (let curr = this.minMs; curr <= this.maxMs; curr += msPerDay) {
        const xPos = this.getXPosition(curr, width);
        if (xPos < 0 || xPos > renderWidth) continue;

        const minorTick = this.createSVGElement('line');
        minorTick.setAttribute('x1', xPos.toString());
        minorTick.setAttribute('x2', xPos.toString());
        minorTick.setAttribute('y1', '0');
        minorTick.setAttribute('y2', '4');
        minorTick.setAttribute('class', 'gantt-axis-tick-minor');
        this.axisArea.appendChild(minorTick);
      }
    }

    let lastTextX = -999;

    for (let currMs = startMsValue; currMs <= endMsValue; currMs += stepMs) {
      const xPos = this.getXPosition(currMs, width);
      if (xPos < 0 || xPos > renderWidth) continue;

      const gridLine = this.createSVGElement('line');
      gridLine.setAttribute('x1', xPos.toString());
      gridLine.setAttribute('x2', xPos.toString());
      gridLine.setAttribute('y1', `-${this.totalHeight - this.config.axisHeight}`);
      gridLine.setAttribute('y2', '0');
      gridLine.setAttribute('class', 'gantt-axis-gridline');
      this.axisArea.appendChild(gridLine);

      const tick = this.createSVGElement('line');
      tick.setAttribute('x1', xPos.toString());
      tick.setAttribute('x2', xPos.toString());
      tick.setAttribute('y1', '0');
      tick.setAttribute('y2', '6');
      tick.setAttribute('class', 'gantt-axis-tick');
      this.axisArea.appendChild(tick);

      // Prevent overlapping text on narrow layouts
      if (xPos - lastTextX > 55) {
        const dateObj = new Date(currMs);
        const text = this.createSVGElement('text');
        text.setAttribute('x', xPos.toString());
        text.setAttribute('y', '24');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('class', 'gantt-axis-text');

        // Render format dynamically based on scale
        if (stepDays >= 365) {
          text.textContent = dateObj.getFullYear().toString();
        } else if (stepDays >= 30) {
          text.textContent = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
        } else {
          text.textContent = dateObj.toISOString().split('T')[0];
        }

        this.axisArea.appendChild(text);
        lastTextX = xPos;
      }
    }
  }

  setupNativeZoomAndPan() {
    this.svg.addEventListener('mousedown', (e: MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains('gantt-item')) return;
      this.isDragging = true;
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
      }
    });

    this.svg.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const width = this.container.clientWidth || 800;
      const rect = this.svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - this.config.margin.left;

      const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const nextScale = Math.min(100, Math.max(0.05, this.zoomScale * zoomFactor));

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
      this.tooltip.style.left = `${event.clientX + 15}px`;
      this.tooltip.style.top = `${event.clientY + 15}px`;

      this.hoverTitle.textContent = d.name;

      const startStr = d.startDate.toISOString().split('T')[0];
      const endStr = d.endDate.toISOString().split('T')[0];

      this.hoverDates.textContent = d.type === 'bar' ? `${startStr} bis ${endStr}` : startStr;
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
