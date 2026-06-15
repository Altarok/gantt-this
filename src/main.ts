import { MarkdownPostProcessorContext, MarkdownRenderChild, Plugin } from 'obsidian';
import { FantasyGanttSettings, DEFAULT_SETTINGS, FantasyGanttSettingTab } from './settings';

interface GanttItem {
  id: number;
  name: string;
  startDate: Date;
  endDate: Date;
  startMs: number;
  endMs: number;
  group: string;
  type: 'bar' | 'point';
  calendarType: string;
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

interface CalendarTrack {
  calendarType: string;
  groups: GanttGroup[];
  yOffset: number;
  height: number;
  minMs: number;
  maxMs: number;
  zoomScale: number;
  zoomTranslateX: number;
}

class GanttTooltipComponent extends MarkdownRenderChild {
  constructor(containerEl: HTMLElement, private tooltipEl: HTMLElement) {
    super(containerEl);
  }

  onunload() {
    if (this.tooltipEl) {
      this.tooltipEl.remove();
    }
  }
}

export default class FantasyGanttPlugin extends Plugin {
  settings: FantasyGanttSettings;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new FantasyGanttSettingTab(this.app, this));

    this.registerMarkdownCodeBlockProcessor('fantasy-gantt', async (source, el, ctx) => {
      this.registerCalendar(el, source, ctx);
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.app.metadataCache.trigger('resolved');
  }

  private registerCalendar(el: HTMLElement, source: string, ctx: MarkdownPostProcessorContext) {
    const currentFile = this.app.workspace.getActiveFile();
    if (!currentFile || !currentFile.parent) {
      el.createEl('pre', { text: 'Error: Could not determine current directory path scope.' });
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

    const toggleBars = createCheckbox('Show Bars', 'toggle-bars');
    const togglePoints = createCheckbox('Show Points', 'toggle-points');
    const toggleGrouping = createCheckbox('Enable Grouping', 'toggle-grouping');
    const resetBtn = toolbar.createEl('button', { text: 'Zoom Reset', cls: 'gantt-btn' });

    const chartContainer = mainWrapper.createDiv({ cls: 'gantt-chart-container' });
    const tooltip = document.body.createDiv({ cls: 'gantt-tooltip', attr: { id: 'gantt-tooltip-element' } });

    ctx.addChild(new GanttTooltipComponent(el, tooltip));

    const hoverTitle = tooltip.createDiv({ cls: 'tooltip-title' });
    const hoverDates = tooltip.createDiv({ cls: 'tooltip-dates' });
    const hoverLink = tooltip.createDiv({ cls: 'tooltip-link', text: 'Click to open active note file' });

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

    const updateCallback = () => {
      const updatedData = this.getGanttDataFromFolder(targetFolderPath);
      renderEngine.updateData(updatedData);
    };

    this.registerEvent(this.app.metadataCache.on('changed', updateCallback));
    this.registerEvent(this.app.metadataCache.on('resolved', updateCallback));
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

        if (startInput === undefined || startInput === null || startInput === '') return;

        const calendarType = (frontmatter['gantt-type'] || this.settings.defaultType).trim();
        if (this.settings.visibleCalendars[calendarType] === false) return;

        const startDate = new Date(startInput);
        const hasValidEnd = endInput !== undefined && endInput !== null && endInput !== '';
        const endDate = hasValidEnd ? new Date(endInput) : new Date(startDate);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return;
        }

        const calculatedType = (!hasValidEnd || startDate.getTime() === endDate.getTime()) ? 'point' : 'bar';
        const itemGroup = frontmatter['gantt-group'] || 'General';

        const finalColor = frontmatter['gantt-color'] ||
          this.settings.groupColors[itemGroup] ||
          this.settings.typeColors[calendarType] ||
          this.settings.fallbackColor;

        items.push({
          id: incrementalId++,
          name: frontmatter['gantt-name'] || file.basename,
          startDate,
          endDate,
          startMs: startDate.getTime(),
          endMs: endDate.getTime(),
          group: itemGroup,
          type: calculatedType,
          calendarType,
          color: finalColor,
          link: file.path
        });
      }
    });

    return items;
  }
}

class GanttRenderEngine {
  private svg: SVGElement;
  private backgroundG: SVGElement;
  private chartArea: SVGElement;
  private dataG: SVGElement;
  private axisG: SVGElement;
  private clipRect: SVGElement;

  private tracks: CalendarTrack[] = [];
  private totalHeight = 400;
  private resizeObserver: ResizeObserver;

  private settings = { showBars: true, showPoints: true, enableGrouping: true };
  private config = {
    rowHeight: 24,
    groupHeaderHeight: 25,
    axisHeight: 40,
    trackSpacerHeight: 20,
    margin: { top: 10, right: 0, bottom: 10, left: 0 }
  };

  private isDragging = false;
  private startX = 0;
  private startTranslateX = 0;
  private activeTrackIndex: number | null = null;

  constructor(
    public readonly container: HTMLElement,
    public readonly rawData: GanttItem[],
    public readonly tooltip: HTMLElement,
    public readonly hoverTitle: HTMLElement,
    public readonly hoverDates: HTMLElement,
    public readonly hoverLink: HTMLElement,
    public readonly plugin: FantasyGanttPlugin
  ) {
    this.initLayout();
    this.initChartStructure();

    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    this.resizeObserver.observe(this.container);
  }

  private calculateTrackBounds(items: GanttItem[]) {
    if (items.length === 0) {
      const now = new Date().getTime();
      return {
        minMs: now - 15 * 24 * 60 * 60 * 1000,
        maxMs: now + 15 * 24 * 60 * 60 * 1000
      };
    }
    const startValues = items.map(d => d.startMs);
    const endValues = items.map(d => Math.max(d.startMs, d.endMs));
    const paddingMs = 15 * 24 * 60 * 60 * 1000;

    return {
      minMs: Math.min(...startValues) - paddingMs,
      maxMs: Math.max(...endValues) + paddingMs
    };
  }

  public updateData(newData: GanttItem[]) {
    // Preserve active zoom transformations across local data changes if tracks match
    const oldTransforms = new Map<string, { scale: number; transX: number }>();
    this.tracks.forEach(t => oldTransforms.set(t.calendarType, { scale: t.zoomScale, transX: t.zoomTranslateX }));

    this.rawData = newData;
    this.initLayout();

    // Reapply user transforms
    this.tracks.forEach(t => {
      const saved = oldTransforms.get(t.calendarType);
      if (saved) {
        t.zoomScale = saved.scale;
        t.zoomTranslateX = saved.transX;
      }
    });

    this.initChartStructure();
    this.handleResize();
  }

  private calculateStacking(items: GanttItem[]) {
    const sorted = [...items].sort((a, b) => a.startMs - b.startMs);
    const lanes: GanttItem[][] = [];
    sorted.forEach(item => {
      let placed = false;
      for (let i = 0; i < lanes.length; i++) {
        const lastItem = lanes[i][lanes[i].length - 1];
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
    let filteredData: GanttItem[] = [];
    if (this.settings.showBars) filteredData = filteredData.concat(this.rawData.filter(d => d.type === 'bar'));
    if (this.settings.showPoints) filteredData = filteredData.concat(this.rawData.filter(d => d.type === 'point'));

    // Extract all distinct calendar types present in active dataset
    const presentCalendarTypes = Array.from(new Set(filteredData.map(d => d.calendarType)));

    let currentYOffset = this.config.margin.top;
    this.tracks = [];

    presentCalendarTypes.forEach(calType => {
      const trackItems = filteredData.filter(d => d.calendarType === calType);
      const { minMs, maxMs } = this.calculateTrackBounds(trackItems);

      const trackGroups: GanttGroup[] = [];
      let trackHeightCalculated = 0;

      if (this.settings.enableGrouping) {
        const groupedMap = new Map<string, GanttItem[]>();
        trackItems.forEach(item => {
          const gName = item.group || 'General';
          if (!groupedMap.has(gName)) groupedMap.set(gName, []);
          groupedMap.get(gName)?.push(item);
        });

        let groupYOffset = 0;
        groupedMap.forEach((items, groupName) => {
          const { processedData, totalLanes } = this.calculateStacking(items);
          const groupHeight = Math.max(1, totalLanes) * this.config.rowHeight + this.config.groupHeaderHeight;
          trackGroups.push({
            name: groupName,
            items: processedData,
            yOffset: groupYOffset,
            height: groupHeight,
            lanes: totalLanes
          });
          groupYOffset += groupHeight;
        });
        trackHeightCalculated = groupYOffset + this.config.axisHeight;
      } else {
        const { processedData, totalLanes } = this.calculateStacking(trackItems);
        const height = Math.max(1, totalLanes) * this.config.rowHeight;
        trackGroups.push({
          name: 'All',
          items: processedData,
          yOffset: 0,
          height: height,
          lanes: totalLanes
        });
        trackHeightCalculated = height + this.config.axisHeight;
      }

      this.tracks.push({
        calendarType: calType,
        groups: trackGroups,
        yOffset: currentYOffset,
        height: trackHeightCalculated,
        minMs,
        maxMs,
        zoomScale: 1,
        zoomTranslateX: 0
      });

      currentYOffset += trackHeightCalculated + this.config.trackSpacerHeight;
    });

    this.totalHeight = currentYOffset + this.config.margin.bottom;
    this.container.style.height = `${this.totalHeight}px`;
  }

  private getXPosition(ms: number, width: number, track: CalendarTrack): number {
    const renderWidth = width - this.config.margin.left - this.config.margin.right;
    const percentage = (ms - track.minMs) / (track.maxMs - track.minMs);
    return (percentage * renderWidth * track.zoomScale) + track.zoomTranslateX;
  }

  private createSVGElement(tag: string): SVGElement {
    return document.createElementNS('http://www.w3.org/2000/svg', tag);
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

    this.axisG = this.createSVGElement('g');
    this.chartArea.appendChild(this.axisG);

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

    this.tracks.forEach(track => {
      const trackG = this.createSVGElement('g');
      trackG.setAttribute('transform', `translate(0, ${track.yOffset})`);

      // Draw overall boundary background block for each separate calendar system
      const trackBg = this.createSVGElement('rect');
      trackBg.setAttribute('width', width.toString());
      trackBg.setAttribute('height', track.height.toString());
      trackBg.setAttribute('class', 'gantt-track-background');
      trackBg.setAttribute('style', 'fill: var(--background-secondary-alt); opacity: 0.4; stroke: var(--background-modifier-border); stroke-width: 1;');
      trackG.appendChild(trackBg);

      // Track Title Ribbon Badge
      const titleText = this.createSVGElement('text');
      titleText.setAttribute('x', '10');
      titleText.setAttribute('y', '-4');
      titleText.setAttribute('style', 'font-size: 0.85em; font-weight: bold; fill: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;');
      titleText.textContent = `${track.calendarType} Timescale`;
      trackG.appendChild(titleText);

      track.groups.forEach((group, idx) => {
        if (this.settings.enableGrouping) {
          const groupG = this.createSVGElement('g');
          groupG.setAttribute('transform', `translate(0, ${group.yOffset})`);

          const rect = this.createSVGElement('rect');
          rect.setAttribute('width', width.toString());
          rect.setAttribute('height', group.height.toString());
          rect.setAttribute('class', idx % 2 === 0 ? 'gantt-group-row-even' : 'gantt-group-row-odd');
          groupG.appendChild(rect);

          const text = this.createSVGElement('text');
          text.setAttribute('x', '20');
          text.setAttribute('y', '17');
          text.setAttribute('class', 'gantt-group-text');
          text.textContent = group.name.toUpperCase();
          groupG.appendChild(text);

          const computedLength = (text as any).getComputedTextLength ? (text as any).getComputedTextLength() : 0;
          const textWidthEstimate = computedLength > 0 ? computedLength : group.name.length * 6.5;
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
          trackG.appendChild(groupG);
        }
      });

      this.backgroundG.appendChild(trackG);
    });
  }

  renderData(width: number) {
    this.dataG.innerHTML = '';

    this.tracks.forEach(track => {
      const trackG = this.createSVGElement('g');
      trackG.setAttribute('transform', `translate(0, ${track.yOffset})`);

      track.groups.forEach(group => {
        const groupYStart = group.yOffset + (this.settings.enableGrouping ? this.config.groupHeaderHeight : 0);

        group.items.forEach((d: GanttItem) => {
          if (d.type === 'bar') {
            const x1 = this.getXPosition(d.startMs, width, track);
            const x2 = this.getXPosition(d.endMs, width, track);
            const barWidth = Math.max(2, x2 - x1);

            const rect = this.createSVGElement('rect');
            rect.setAttribute('class', 'gantt-item bar-rect');
            rect.setAttribute('x', x1.toString());
            rect.setAttribute('y', (groupYStart + d.lane! * this.config.rowHeight + 4).toString());
            rect.setAttribute('width', barWidth.toString());
            rect.setAttribute('height', (this.config.rowHeight - 8).toString());
            if (d.color) rect.setAttribute('fill', d.color);
            rect.setAttribute('data-id', d.id.toString());
            trackG.appendChild(rect);
          } else if (d.type === 'point') {
            const cx = this.getXPosition(d.startMs, width, track);

            const circle = this.createSVGElement('circle');
            circle.setAttribute('class', 'gantt-item point-circle');
            circle.setAttribute('cx', cx.toString());
            circle.setAttribute('cy', (groupYStart + d.lane! * this.config.rowHeight + this.config.rowHeight / 2).toString());
            circle.setAttribute('r', '6');
            if (d.color) circle.setAttribute('fill', d.color);
            circle.setAttribute('data-id', d.id.toString());
            trackG.appendChild(circle);
          }
        });
      });

      this.dataG.appendChild(trackG);
    });
  }

  drawAxes(width: number) {
    this.axisG.innerHTML = '';
    const renderWidth = width - this.config.margin.left - this.config.margin.right;

    this.tracks.forEach(track => {
      const trackAxisY = track.yOffset + track.height - this.config.axisHeight;
      const trackAxisG = this.createSVGElement('g');
      trackAxisG.setAttribute('transform', `translate(0, ${trackAxisY})`);

      const baseline = this.createSVGElement('line');
      baseline.setAttribute('x1', '0');
      baseline.setAttribute('x2', renderWidth.toString());
      baseline.setAttribute('y1', '0');
      baseline.setAttribute('y2', '0');
      baseline.setAttribute('class', 'gantt-axis-baseline');
      trackAxisG.appendChild(baseline);

      const totalDaysSpan = (track.maxMs - track.minMs) / (24 * 60 * 60 * 1000) / track.zoomScale;

      let stepDays = 1;
      if (totalDaysSpan > 365 * 3) stepDays = 365;
      else if (totalDaysSpan > 365) stepDays = 90;
      else if (totalDaysSpan > 60) stepDays = 30;
      else if (totalDaysSpan > 20) stepDays = 7;
      else if (totalDaysSpan > 5) stepDays = 2;

      const msPerDay = 24 * 60 * 60 * 1000;
      const stepMs = stepDays * msPerDay;

      const startMsValue = Math.floor(track.minMs / stepMs) * stepMs - stepMs;
      const endMsValue = Math.ceil(track.maxMs / stepMs) * stepMs + stepMs;

      // Draw vertical background grid lines specific to this timescale zoom position
      if (totalDaysSpan < 60 && stepDays > 1) {
        for (let curr = track.minMs; curr <= track.maxMs; curr += msPerDay) {
          const xPos = this.getXPosition(curr, width, track);
          if (xPos < 0 || xPos > renderWidth) continue;

          const minorTick = this.createSVGElement('line');
          minorTick.setAttribute('x1', xPos.toString());
          minorTick.setAttribute('x2', xPos.toString());
          minorTick.setAttribute('y1', '0');
          minorTick.setAttribute('y2', '4');
          minorTick.setAttribute('class', 'gantt-axis-tick-minor');
          trackAxisG.appendChild(minorTick);
        }
      }

      let lastTextX = -999;

      for (let currMs = startMsValue; currMs <= endMsValue; currMs += stepMs) {
        const xPos = this.getXPosition(currMs, width, track);
        if (xPos < 0 || xPos > renderWidth) continue;

        const gridLine = this.createSVGElement('line');
        gridLine.setAttribute('x1', xPos.toString());
        gridLine.setAttribute('x2', xPos.toString());
        gridLine.setAttribute('y1', `-${track.height - this.config.axisHeight}`);
        gridLine.setAttribute('y2', '0');
        gridLine.setAttribute('class', 'gantt-axis-gridline');
        trackAxisG.appendChild(gridLine);

        const tick = this.createSVGElement('line');
        tick.setAttribute('x1', xPos.toString());
        tick.setAttribute('x2', xPos.toString());
        tick.setAttribute('y1', '0');
        tick.setAttribute('y2', '6');
        tick.setAttribute('class', 'gantt-axis-tick');
        trackAxisG.appendChild(tick);

        if (xPos - lastTextX > 55) {
          const dateObj = new Date(currMs);
          const text = this.createSVGElement('text');
          text.setAttribute('x', xPos.toString());
          text.setAttribute('y', '22');
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('class', 'gantt-axis-text');

          if (stepDays >= 365) {
            text.textContent = dateObj.getFullYear().toString();
          } else if (stepDays >= 30) {
            text.textContent = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
          } else {
            text.textContent = dateObj.toISOString().split('T')[0];
          }

          trackAxisG.appendChild(text);
          lastTextX = xPos;
        }
      }

      this.axisG.appendChild(trackAxisG);
    });
  }

  private getTrackIndexAtY(y: number): number | null {
    for (let i = 0; i < this.tracks.length; i++) {
      const t = this.tracks[i];
      if (y >= t.yOffset && y <= t.yOffset + t.height) {
        return i;
      }
    }
    return null;
  }

  setupNativeZoomAndPan() {
    this.svg.addEventListener('mousedown', (e: MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains('gantt-item')) return;

      const rect = this.svg.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const trackIdx = this.getTrackIndexAtY(clickY);

      if (trackIdx !== null) {
        this.isDragging = true;
        this.activeTrackIndex = trackIdx;
        this.startX = e.clientX;
        this.startTranslateX = this.tracks[trackIdx].zoomTranslateX;
      }
    });

    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isDragging || this.activeTrackIndex === null) return;

      const width = this.container.clientWidth || 800;
      const deltaX = e.clientX - this.startX;

      this.tracks[this.activeTrackIndex].zoomTranslateX = this.startTranslateX + deltaX;

      this.renderData(width);
      this.drawAxes(width);
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.activeTrackIndex = null;
    });

    this.svg.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const rect = this.svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - this.config.margin.left;
      const mouseY = e.clientY - rect.top;

      const trackIdx = this.getTrackIndexAtY(mouseY);
      if (trackIdx === null) return;

      const width = this.container.clientWidth || 800;
      const track = this.tracks[trackIdx];

      const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const nextScale = Math.min(100, Math.max(0.05, track.zoomScale * zoomFactor));

      track.zoomTranslateX = mouseX - (mouseX - track.zoomTranslateX) * (nextScale / track.zoomScale);
      track.zoomScale = nextScale;

      this.renderData(width);
      this.drawAxes(width);
    }, { passive: false });
  }

  resetZoom() {
    this.tracks.forEach(t => {
      t.zoomScale = 1;
      t.zoomTranslateX = 0;
    });
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

      this.hoverDates.textContent = d.type === 'bar' ? `${startStr} to ${endStr}` : startStr;
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
