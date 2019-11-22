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
            return `rgba(0, 125, ${255 * (elem - Math.min(...color_data)) / (Math.max(...color_data) - Math.min(...color_data))}, 0.33)`
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
            name: 'size: avg. firing rate',
            marker: {
              size: this.size_data_adjusted,
              color: 'rgba(255, 255, 255, 0.2)',
              line: {
                color: this.color_data_adjusted,
                // color: this.test_color_data,
                width: 2,
              },
              colorbar: {
                thickness: 10,
                title: 'Unit Amp (µV)'
              },
              cmax: Math.max(...color_data),
              cmin: Math.min(...color_data),
              // colorscale: [['0.0', '0'], ['1.0', '1']]
              colorscale: [['0.0','rgba(0, 125, 0, 0.33)'], ['1.0','rgba(0, 125, 255, 0.33)']]
            }
          }];

          this.plot_layout = {
            // autosize: false,
            width: 400,
            height: 600,
            yaxis: {
              title: 'Unit Depth (µm)'
            },
            xaxis: {
              title: 'Unit x position (µm)'
            },
            hovermode: 'closest',
            showlegend: true,
            legend: {
              x: -0.1,
              y: -0.2
            }
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
        size_data.push(entry['avg_firing_rate']);
        y_data.push(entry['unit_depth']);
        x_data.push(entry['unit_posx']);
        color_data.push(entry['unit_amp']);
        this.cellsByProbeIns.push(entry);
      }
    }

    this.size_data_adjusted = size_data.map(function (el) {
      return 8 + (12 * (el - Math.min(...size_data)) / (Math.max(...size_data)) - Math.min(...size_data));
    });

    this.color_data_adjusted = color_data.map(function (elem) {
      return `rgba(0, 125, ${255 * (elem - Math.min(...color_data)) / (Math.max(...color_data) - Math.min(...color_data))}, 0.33)`
    });
    this.plot_data = [{
      x: x_data,
      y: y_data,
      customdata: id_data,
      text: id_data,
      mode: 'markers',
      name: 'size: avg. firing rate',
      marker: {
        size: this.size_data_adjusted,
        color: 'rgba(255, 255, 255, 0.2)',
        line: {
          color: this.color_data_adjusted,
          width: 2
        },
        colorbar: {
          thickness: 10,
          title: 'Unit Amp (µV)'
        },
        cmax: Math.max(...color_data),
        cmin: Math.min(...color_data),
        colorscale: [['0.0', 'rgba(0, 125, 0, 0.33)'], ['1.0', 'rgba(0, 125, 255, 0.33)']]
      }
    }];
    this.unitBehaviorLoading = false;
    this.unitPsthLoading = false;
    this.targetUnitId = 1;
    this.clickedUnitId = 1;
    console.log('plot data for probe (' + probeInsNum + ') is - ', this.plot_data);
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
    const element = this.el_nav.nativeElement.children[1];
    const rows = element.querySelectorAll('tr');
    this.clickedUnitId = unit_id;
    this.targetUnitId = this.clickedUnitId;
 
  }

  navigate_cell_plots(event, direction) {
    if (direction === 'up') {
      if (this.clickedUnitId - 1 > -1) {
        this.clickedUnitId -= 1;
        this.targetUnitId = this.clickedUnitId;
      }
    }
    if (direction === 'down') {
      if (this.clickedUnitId + 1 < this.plot_data[0]['x'].length + 1) {
        this.clickedUnitId += 1;
        this.targetUnitId = this.clickedUnitId;
      }
    }
  }


}
