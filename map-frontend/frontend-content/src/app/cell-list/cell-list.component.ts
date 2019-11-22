import { Component, OnInit, OnDestroy, ElementRef, ViewChild, Input, DoCheck, HostListener} from '@angular/core';

import { Subscription } from 'rxjs';

import { CellListService } from './cell-list.service';

import { environment } from '../../environments/environment';
const BACKEND_URL = environment.backend_url;

// declare var Plotly: any;

@Component({
  selector: 'app-cell-list',
  templateUrl: './cell-list.component.html',
  styleUrls: ['./cell-list.component.css']
})
export class CellListComponent implements OnInit, OnDestroy, DoCheck {
  // d3 = Plotly.d3;
  cells: any;
  session: any;
  clickedUnitId: number;
  cellsByProbeIns = [];
  plot_data;
  plot_layout;
  plot_config;

  // raster_data = [];
  // raster_layout = [];
  // raster_config = [];
  // rasterPlotList;
  // rasterTemplates = [];

  // psth_data = [];
  // psth_layout0 = {};
  // psth_config0 = {};
  // psth_layout = [];
  // psth_config = [];
  // psthPlotList;
  // psthTemplates = [];

  targetClusterRowInfo = [];
  targetUnitId;
  targetClusterDepth;
  targetClusterAmp;
  targetProbeIndex;

  eventType;
  sortType;
  probeIndex;

  showController = false;

  color_data_adjusted;
  size_data_adjusted;
  test_color_data;

  probeInsertions = [];

  unitBehaviorLoading = true;
  unitPsthLoading = true;

  private cellListSubscription: Subscription;
  // private rasterListSubscription: Subscription;
  // private psthListSubscription: Subscription;
  // private rasterTemplateSubscription: Subscription;
  // private psthTemplatesSubscription: Subscription;
  @Input() sessionInfo: Object;
  @ViewChild('navTable') el_nav: ElementRef;

  constructor(public cellListService: CellListService) { }
  @HostListener('window:keyup', ['$event']) keyEvent(event) {
    if (event.key === 'ArrowUp') {
      this.navigate_cell_plots({}, 'up');
    } else if (event.key === 'ArrowDown') {
      this.navigate_cell_plots({}, 'down');
    }
  }
  @HostListener('window:scroll', ['$event']) onWindowScroll(event) {
    // console.log('logging scroll event - ', event);
    if (window.pageYOffset > 2000) {
      this.showController = true;
    } else {
      this.showController = false;
    }
  }
  ngOnInit() {
    // console.log('window height: ', window.innerHeight);
    // console.log('window screen height: ', window.screen.height);
    // const element = this.el_nav.nativeElement;
    this.session = this.sessionInfo;
    let probeCount = 0
    while (probeCount < this.sessionInfo['probe_count']) {
      this.probeInsertions.push(probeCount + 1);
      probeCount++;
    }
    this.cellListService.retrieveCellList(this.sessionInfo);
    this.cellListSubscription = this.cellListService.getCellListLoadedListener()
      .subscribe((cellListData) => {
        console.log('logging retrieved cell list data: ', cellListData);
        if (Object.entries(cellListData).length > 0) {
          this.cells = cellListData;
          const x_data = [];
          const y_data = [];
          const id_data = [];
          const size_data = [];
          const color_data = [];
          this.cellsByProbeIns = [];
          for (let entry of Object.values(cellListData)) {
            if (entry['insertion_number'] == 1) {
              id_data.push(entry['unit']);
              size_data.push(entry['avg_firing_rate']);
              y_data.push(entry['unit_depth']);
              x_data.push(entry['unit_posx']);
              color_data.push(entry['unit_amp']);
              this.cellsByProbeIns.push(entry);
            }
          }
          // console.log('x_data is: ', x_data);
          // console.log('y_data is: ', y_data);
          // console.log('id_data is: ', id_data)
          // console.log('color_data is: ', color_data);
          // console.log('size_data is: ', size_data);
          console.log('max of size is: ', Math.max(...size_data));
          console.log('min of size is: ', Math.min(...size_data));
          console.log('max of depth(y) is: ', Math.max(...y_data));
          console.log('min of depth(y) is: ', Math.min(...y_data));
          console.log('max of color is: ', Math.max(...color_data));
          console.log('min of color is: ', Math.min(...color_data));
          // console.log('cellByProbeIns is: ', this.cellsByProbeIns);
          this.size_data_adjusted = size_data.map(function(el) {
            return 8 + (12 * (el - Math.min(...size_data))/(Math.max(...size_data)) - Math.min(...size_data));
          });

          this.test_color_data = color_data.map(function(item) {
            return (item - Math.min(...color_data)) / (Math.max(...color_data) - Math.min(...color_data));
          })

          this.color_data_adjusted = color_data.map(function(elem) {
            return `rgba(25, ${255 * (elem - Math.min(...color_data)) / (Math.max(...color_data) - Math.min(...color_data))}, ${255 * (elem - Math.min(...color_data)) / (Math.max(...color_data) - Math.min(...color_data))}, 0.33)`
          });
          this.targetUnitId = 1;
          this.clickedUnitId = 1;
          // console.log('adjusted color data:', this.color_data_adjusted);
          this.plot_data = [{
            x: x_data,
            y: y_data,
            customdata: id_data,
            text: id_data,
            mode: 'markers',
            marker: {
              size: this.size_data_adjusted,
              color: 'rgba(255, 255, 255, 0.2)',
              line: {
                color: this.color_data_adjusted,
                // color: this.test_color_data,
                width: 2
              },
              colorbar: {
                thickness: 10,
                title: 'Unit Amp (µV)'
              },
              cmax: Math.max(...color_data),
              cmin: Math.min(...color_data),
              // colorscale: [['0.0', '0'], ['1.0', '1']]
              colorscale: [['0.0','rgba(25, 0, 0, 0.33)'], ['1.0','rgba(25, 255,255, 0.33)']]
            }
          }];

          this.plot_layout = {
            yaxis: {
              title: 'Unit Depth (µm)'
            },
            xaxis: {
              title: 'Unit x position (µm)'
            },
            hovermode: 'closest'
          };

          this.plot_config = {
            showLink: false,
            showSendToCloud: false,
            displaylogo: false,
            modeBarButtonsToRemove: ['select2d', 'lasso2d', 'hoverClosestCartesian',
                            'hoverCompareCartesian', 'toImage', 'toggleSpikelines'],
          };
          this.unitBehaviorLoading = false;
          this.unitPsthLoading = false;
        }
      });
    // // initial setting for the raster viewer
    // this.eventType = 'feedback';
    // this.sortType = 'trial_id';
    // this.targetUnitId = 0;
    // this.probeIndex = 0;
    // const queryInfo = {};
    // queryInfo['subject_uuid'] = this.sessionInfo['subject_uuid'];
    // queryInfo['session_start_time'] = this.sessionInfo['session_start_time'];
    // queryInfo['probe_idx'] = this.probeIndex;
    // queryInfo['cluster_revision'] = '0';
    // queryInfo['event'] = this.eventType;
    // queryInfo['sort_by'] = this.sortType;

    // this.cellListService.retrieveRasterTemplates();
    // this.rasterTemplateSubscription = this.cellListService.getRasterTemplatesLoadedListener()
    //   .subscribe((templates) => {
    //     console.log('raster templates retrieved');
    //     for (const [index, temp] of Object.entries(templates)) {
    //       if (temp['template_idx'] === parseInt(index, 10)) {
    //         this.rasterTemplates.push(temp['raster_data_template']);
    //       }
    //     }
    //     let titleJoined = '';
    //     this.cellListService.retrieveRasterList(queryInfo);
    //     this.rasterListSubscription = this.cellListService.getRasterListLoadedListener()
    //       .subscribe((rasterPlotList) => {
    //         console.log('raster plot list - ', rasterPlotList);
    //         this.rasterPlotList = rasterPlotList;
    //         const timeA = new Date();
    //         for (const raster of Object.values(rasterPlotList)) {
    //           const currentTemplate = this.rasterTemplates[raster['template_idx']];
    //           const dataCopy = Object.assign([], currentTemplate['data']);
    //           dataCopy[0] = {
    //             y: raster['plot_ylim'],
    //             x: ['-1', '1'],
    //             type: 'scatter',
    //             showlegend: false,
    //             mode: 'markers',
    //             marker: { opacity: '0'}
    //           };
    //           this.raster_data.push(dataCopy);
    //           // this.raster_data.push(currentTemplate['data']);

    //           const layoutCopy = Object.assign({}, currentTemplate['layout']);
    //           layoutCopy['images'] = [{
    //             // source: 'http://localhost:3333' + raster['plotting_data_link'],
    //             source: raster['plotting_data_link'],
    //             y: raster['plot_ylim'][1],
    //             sizey: parseFloat(raster['plot_ylim'][1]) - parseFloat(raster['plot_ylim'][0]),
    //             layer: 'below',
    //             sizex: 2,
    //             sizing: 'stretch',
    //             x: '-1',
    //             xref: 'x',
    //             yref: 'y'
    //           }];
    //           // layoutCopy['images'][0]['source'] = 'http://' + raster['plotting_data_link'];
    //           titleJoined = `${currentTemplate.layout.title.text} ${raster['mark_label']}`;
    //           layoutCopy['title.text'] = titleJoined;
    //           layoutCopy['yaxis'] = {range: raster['plot_ylim']};
    //           layoutCopy['width'] = 658;
    //           layoutCopy['height'] = 420;
    //           // layoutCopy['template'] = {};
    //           this.raster_layout.push(layoutCopy);
    //           this.raster_config.push({});
    //         }
    //         console.log('layout - ', this.raster_layout);
    //         console.log('data - ', this.raster_data);
    //   });
    // });

    // const psthQueryInfo = {};
    // psthQueryInfo['subject_uuid'] = this.sessionInfo['subject_uuid'];
    // psthQueryInfo['session_start_time'] = this.sessionInfo['session_start_time'];
    // psthQueryInfo['probe_idx'] = this.probeIndex;
    // psthQueryInfo['cluster_revision'] = '0';
    // psthQueryInfo['event'] = this.eventType;

    // this.cellListService.retrievePsthTemplates();
    // this.psthTemplatesSubscription = this.cellListService.getPsthTemplatesLoadedListener()
    //   .subscribe((template) => {
    //     console.log('psth template retrieved');
    //     for (const [index, temp] of Object.entries(template)) {
    //       if (temp['psth_template_idx'] === parseInt(index, 10)) {
    //         this.psthTemplates.push(temp['psth_data_template']);
    //       }
    //     }
    //     this.cellListService.retrievePSTHList(psthQueryInfo);
    //     this.psthListSubscription = this.cellListService.getPSTHListLoadedListener()
    //       .subscribe((psthPlotList) => {
    //         console.log('psth plot list - ', psthPlotList);
    //         this.psthPlotList = psthPlotList;
    //         const timeA = new Date();
    //         for (const psth of Object.values(psthPlotList)) {
    //           const currentTemplate = this.psthTemplates[psth['psth_template_idx']];
    //           const dataCopy = Object.assign([], currentTemplate['data']);
    //           // data = [left, right, incorrect, all]
    //           dataCopy[0] = {
    //             y: psth['psth_left'].split(','),
    //             x: psth['psth_time'].split(','),
    //             name: 'left trials',
    //             mode: 'lines',
    //             marker: { size: 6, color: 'green'}
    //           };
    //           dataCopy[1] = {
    //             y: psth['psth_right'].split(','),
    //             x: psth['psth_time'].split(','),
    //             name: 'right trials',
    //             mode: 'lines',
    //             marker: { size: 6, color: 'blue' }
    //           };
    //           dataCopy[2] = {
    //             y: psth['psth_incorrect'].split(','),
    //             x: psth['psth_time'].split(','),
    //             name: 'incorrect trials',
    //             mode: 'lines',
    //             marker: { size: 6, color: 'red' }
    //           };
    //           dataCopy[3] = {
    //             y: psth['psth_all'].split(','),
    //             x: psth['psth_time'].split(','),
    //             name: 'all trials',
    //             mode: 'lines',
    //             marker: { size: 6, color: 'black' }
    //           };
    //           this.psth_data.push(dataCopy);

    //           const layoutCopy = Object.assign({}, currentTemplate['layout']);
    //           layoutCopy['title']['text'] = `PSTH, aligned to ${psth['event']} time`;
    //           layoutCopy['xaxis']['range'] = psth['psth_x_lim'].split(',');
    //           layoutCopy['width'] = 658;
    //           layoutCopy['height'] = 420;
    //           this.psth_layout.push(layoutCopy);
    //           this.psth_config.push({});
    //         }
    //         console.log('psth layout - ', this.psth_layout);
    //         console.log('psth data - ', this.psth_data);
    //       });
    //   });

  }

  ngDoCheck() {
    // console.log('do check ran');
    // console.log('this.clicked cluster id: ', this.clickedUnitId);
    const markerColors = [];
    if (this.plot_data) {
      if (this.plot_data[0]['x'] && this.clickedUnitId > -1) {
        for (let i = 0; i < this.plot_data[0]['x'].length; i++) {
          if (this.clickedUnitId - 1 === i) {
            markerColors.push('rgba(0, 0, 0, 1)'); // black
          } else {
            markerColors.push(this.color_data_adjusted[i]); 
            // markerColors.push(this.test_color_data[i]); 
          }
        }
      } else {
        for (let i = 0; i < this.plot_data[0]['x'].length; i++) {
          markerColors.push(this.color_data_adjusted[i]);
          // markerColors.push(this.test_color_data[i]); 
        }
      }
      this.plot_data[0]['marker']['line']['color'] = markerColors;
      // console.log('markerColors: ', markerColors);
    }

    if (this.targetUnitId) {
      this.cells
    }

  }
  ngOnDestroy() {
    if (this.cellListSubscription) {
      this.cellListSubscription.unsubscribe();
    }
    // if (this.rasterListSubscription) {
    //   this.rasterListSubscription.unsubscribe();
    // }
    // if (this.rasterTemplateSubscription) {
    //   this.rasterTemplateSubscription.unsubscribe();
    // }
    // if (this.psthListSubscription) {
    //   this.psthListSubscription.unsubscribe();
    // }
    // if (this.psthTemplatesSubscription) {
    //   this.psthTemplatesSubscription.unsubscribe();
    // }
  }

  probe_selected(probeInsNum) {
    this.unitBehaviorLoading = true;
    this.unitPsthLoading = true;
    console.log('probe insertions selected: ', probeInsNum);
    const x_data = [];
    const y_data = [];
    const id_data = [];
    const size_data = [];
    const color_data = [];
    this.plot_data = [];
    this.cellsByProbeIns = [];
    for (let entry of Object.values(this.cells)) {
      if (entry['insertion_number'] == probeInsNum) {
        id_data.push(entry['unit']);
        size_data.push(entry['unit_amp']);
        y_data.push(entry['unit_posy']);
        x_data.push(entry['unit_posx']);
        color_data.push(entry['unit_depth']);
        this.cellsByProbeIns.push(entry);
      }
    }

    // this.size_data_adjusted = size_data.map(function (el) {
    //   return 5 + 15 * el / Math.max(...size_data)
    // });

    // this.color_data_adjusted = color_data.map(function (elem) {
    //   return `rgba(${255 * Math.abs(elem) / Math.abs(Math.min(...color_data))}, 125, ${255 * Math.abs(Math.max(...color_data)) / Math.abs(elem)}, 0.5)`
    // });
    this.plot_data = [{
      x: x_data,
      y: y_data,
      customdata: id_data,
      text: id_data,
      mode: 'markers',
      marker: {
        size: this.size_data_adjusted,
        color: 'rgba(255, 255, 255, 0.2)',
        line: {
          color: this.color_data_adjusted,
          // color: this.test_color_data,
          width: 2
        },
        colorscale: 'Viridis'
      }
    }];
    this.unitBehaviorLoading = false;
    this.unitPsthLoading = false;
    this.targetUnitId = 1;
    this.clickedUnitId = 1;
  }

  clusterSelectedPlot(data) {
    const element = this.el_nav.nativeElement.children[1];
    console.log('cluster selected from cluster plot!');
    console.log(element);
    console.log('data is: ', data);
    const rows = element.querySelectorAll('tr');
    // console.log('printing rows');
    // console.log(rows);
    // this.targetUnitId = this.clickedUnitId;
    console.log('clicked unitId is: ', this.clickedUnitId);
    if (data['points'] && data['points'][0]['customdata']) {
      console.log('data[points][0] is: ', data['points'][0]);
      this.clickedUnitId = data['points'][0]['customdata'];
      this.targetUnitId = this.clickedUnitId;
      console.log('clicked unitId according to data is: ', data['points'][0]['customdata']);
      rows[this.clickedUnitId].scrollIntoView({
                                      behavior: 'smooth',
                                      block: 'center'});
    }

  }

  clusterSelectedTable(unit_id) {
    console.log('cluster selected from table!');
    const element = this.el_nav.nativeElement.children[1];
    console.log(unit_id);
    const rows = element.querySelectorAll('tr');
    console.log('printing rows');
    console.log(rows);
    this.clickedUnitId = unit_id;
    this.targetUnitId = this.clickedUnitId;
 
  }

  navigate_cell_plots(event, direction) {
    console.log('going', direction, 'the list of cells');
    if (direction === 'up') {
      console.log('arrow upped!');
      if (this.clickedUnitId - 1 > -1) {
        this.clickedUnitId -= 1;
        this.targetUnitId = this.clickedUnitId;
      }
    }
    if (direction === 'down') {
      console.log('arrow down!');
      if (this.clickedUnitId + 1 < this.plot_data[0]['x'].length + 1) {
        this.clickedUnitId += 1;
        this.targetUnitId = this.clickedUnitId;
      }
    }
  }

  // order_by_event(eventType) {
  //   console.log('event order selected!: ', eventType);
  //   this.eventType = eventType;
  //   const queryInfo = {};
  //   queryInfo['subject_uuid'] = this.sessionInfo['subject_uuid'];
  //   queryInfo['session_start_time'] = this.sessionInfo['session_start_time'];
  //   queryInfo['probe_idx'] = this.probeIndex;
  //   queryInfo['cluster_revision'] = '0';
  //   queryInfo['event'] = this.eventType;
  //   queryInfo['sort_by'] = this.sortType;
  //   this.raster_data = [];
  //   this.raster_layout = [];
  //   this.raster_config = [];
  //   this.cellListService.retrieveRasterList(queryInfo);
  //   this.rasterListSubscription = this.cellListService.getRasterListLoadedListener()
  //     .subscribe((rasterPlotList) => {
  //       console.log('rasterplot list data');
  //       console.log(rasterPlotList);
  //       this.rasterPlotList = rasterPlotList;
  //       for (const raster of Object.values(rasterPlotList)) {


  //         this.raster_data.push(this.rasterTemplates[raster['template_idx']]['data']);
  //         // this.raster_data.push(raster['plotting_data']['data']);
  //         const newLayout = this.rasterTemplates[raster['template_idx']]['layout'];
  //         newLayout['images'] = [{
  //               // source: 'http://localhost:3333' + raster['plotting_data_link'],
  //           source: raster['plotting_data_link'],
  //               y: raster['plot_ylim'],
  //               sizey: raster['plot_ylim'][1] - raster['plot_ylim'][0],
  //               layer: 'below',
  //               sizex: '2',
  //               sizing: 'stretch',
  //               x: '-1',
  //               xref: 'x',
  //               yref: 'y'
  //             }];
  //         this.raster_layout.push(newLayout);
  //         this.raster_config.push({});
  //       }
  //     });

  //   const psthQueryInfo = {};
  //   psthQueryInfo['subject_uuid'] = this.sessionInfo['subject_uuid'];
  //   psthQueryInfo['session_start_time'] = this.sessionInfo['session_start_time'];
  //   psthQueryInfo['probe_idx'] = this.probeIndex;
  //   psthQueryInfo['cluster_revision'] = '0';
  //   psthQueryInfo['event'] = this.eventType;
  //   this.psth_data = [];
  //   this.psth_layout = [];
  //   this.psth_config = [];
  //   this.cellListService.retrievePSTHList(psthQueryInfo);
  //   this.psthListSubscription = this.cellListService.getPSTHListLoadedListener()
  //     .subscribe((psthPlotList) => {
  //       console.log('psth list data');
  //       console.log(psthPlotList);
  //       this.psthPlotList = psthPlotList;
  //       for (const psth of Object.values(psthPlotList)) {

  //         const newData = this.psthTemplates[psth['psth_template_idx']]['data'];
  //         newData[0]['y'] = psth['psth_left'].split(',');
  //         newData[0]['x'] = psth['psth_time'].split(',');
  //         newData[1]['y'] = psth['psth_right'].split(',');
  //         newData[1]['x'] = psth['psth_time'].split(',');
  //         newData[2]['y'] = psth['psth_incorrect'].split(',');
  //         newData[2]['x'] = psth['psth_time'].split(',');
  //         newData[3]['y'] = psth['psth_all'].split(',');
  //         newData[3]['x'] = psth['psth_time'].split(',');

  //         const newLayout = this.psthTemplates[psth['psth_template_idx']]['layout'];
  //         newLayout['title']['text'] = `PSTH, aligned to ${psth['event']} time`;
  //         newLayout['xaxis']['range'] = psth['psth_x_lim'].split(',');
  //         this.psth_data.push(newData);
  //         this.psth_layout.push(newLayout);
  //         this.psth_config.push({});
  //       }
  //     });
  // }

  // order_by_sorting(sortType) {
  //   console.log('sort order selected!: ', sortType);
  //   this.sortType = sortType;
  //   const queryInfo = {};
  //   queryInfo['subject_uuid'] = this.sessionInfo['subject_uuid'];
  //   queryInfo['session_start_time'] = this.sessionInfo['session_start_time'];
  //   queryInfo['probe_idx'] = this.probeIndex;
  //   queryInfo['cluster_revision'] = '0';
  //   queryInfo['event'] = this.eventType;
  //   queryInfo['sort_by'] = this.sortType;
  //   this.raster_data = [];
  //   this.raster_layout = [];
  //   this.raster_config = [];
  //   this.cellListService.retrieveRasterList(queryInfo);
  //   this.rasterListSubscription = this.cellListService.getRasterListLoadedListener()
  //     .subscribe((rasterPlotList) => {
  //       console.log('rasterplot list data');
  //       console.log(rasterPlotList);
  //       this.rasterPlotList = rasterPlotList;
  //       for (const raster of Object.values(rasterPlotList)) {

  //         this.raster_data.push(this.rasterTemplates[raster['template_idx']]['data']);
  //         // this.raster_data.push(raster['plotting_data']['data']);
  //         const newLayout = this.rasterTemplates[raster['template_idx']]['layout'];
  //         newLayout['images'] = [{
  //           // source: 'http://localhost:3333' + raster['plotting_data_link'],
  //           source: raster['plotting_data_link'],
  //           y: raster['plot_ylim'],
  //           sizey: raster['plot_ylim'][1] - raster['plot_ylim'][0],
  //           layer: 'below',
  //           sizex: '2',
  //           sizing: 'stretch',
  //           x: '-1',
  //           xref: 'x',
  //           yref: 'y'
  //         }];
  //         // newLayout['images'][0]['source'] = 'http://localhost:3333' + raster['plotting_data_link'];
  //         this.raster_layout.push(newLayout);
  //         // const layout = raster['plotting_data']['layout'];
  //         // /raster/efa5e878-6d7a-47ef-8ec8-ac7d6272cf22/2019-05-07T17:22:20/0/0/feedback/feedback - response/4.png
  //         // layout['images'][0]['source'] =
  //           // BACKEND_URL + `/raster/${subj_id}/${sstime}/${p_idx}/${c_rev}/${event}/${sorting}/${unit_id}.png`;
  //         // 'http://localhost:3333/plotImg/raster/efa5e878-6d7a-47ef-8ec8-ac7d6272cf22/2019-05-07T17:22:20/response/trial_id.0.png';
  //         // this.raster_layout.push(layout);
  //         this.raster_config.push(raster['plotting_data']['config']);
  //       }
  //     });
  // }

}
