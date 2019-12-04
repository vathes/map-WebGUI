import { Component, OnInit, OnDestroy, ElementRef, ViewChild, Input, DoCheck, HostListener} from '@angular/core';

import { Subscription } from 'rxjs';

import { CellListService } from './cell-list.service';

import { Sort } from '@angular/material/sort';


@Component({
  selector: 'app-cell-list',
  templateUrl: './cell-list.component.html',
  styleUrls: ['./cell-list.component.css']
})

export class CellListComponent implements OnInit, OnDestroy, DoCheck {
  cells: any;
  session: any;
  clickedUnitId: number;
  cellsByProbeIns = [];
  sortedCellsByProbeIns = [];
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

  showController = true;

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

  ngOnInit() {
    this.session = this.sessionInfo;
    let probeCount = 0
    while (probeCount < this.sessionInfo['probe_count']) {
      this.probeInsertions.push(probeCount + 1);
      probeCount++;
    }
    let cellsQuery = this.session;
    cellsQuery['is_all'] = 0;
    // this.cellListService.retrieveCellList(this.sessionInfo);
    this.cellListService.retrieveCellList(cellsQuery);
    this.cellListSubscription = this.cellListService.getCellListLoadedListener()
      .subscribe((cellListData) => {
        this.unitBehaviorLoading = false;
        this.unitPsthLoading = false;
        // console.log('logging retrieved cell list data: ', cellListData);
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
          // console.log('max of size is: ', Math.max(...size_data));
          // console.log('min of size is: ', Math.min(...size_data));
          // console.log('max of depth(y) is: ', Math.max(...y_data));
          // console.log('min of depth(y) is: ', Math.min(...y_data));
          // console.log('max of color is: ', Math.max(...color_data));
          // console.log('min of color is: ', Math.min(...color_data));
          // console.log('cellByProbeIns is: ', this.cellsByProbeIns);

          this.sortedCellsByProbeIns = this.cellsByProbeIns;

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
            modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d', 'hoverClosestCartesian',
                            'hoverCompareCartesian', 'toImage', 'toggleSpikelines'],
          };
          
        }
      });

  }

  ngDoCheck() {
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
    // console.log('probe insertions selected: ', probeInsNum);
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

    this.sortedCellsByProbeIns = this.cellsByProbeIns;

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
    // console.log('plot data for probe (' + probeInsNum + ') is - ', this.plot_data);
  }

  clusterSelectedPlot(data) {
    const element = this.el_nav.nativeElement.children[1];
    // console.log('cluster selected from cluster plot!');
    // console.log(element);
    // console.log('data is: ', data);
    const rows = element.querySelectorAll('tr');
    // console.log('printing rows');
    // console.log(rows);
    // this.targetUnitId = this.clickedUnitId;
    // console.log('clicked unitId is: ', this.clickedUnitId);
    if (data['points'] && data['points'][0]['customdata']) {
      // console.log('data[points][0] is: ', data['points'][0]);
      this.clickedUnitId = data['points'][0]['customdata'];
      this.targetUnitId = this.clickedUnitId;
      // console.log('clicked unitId according to data is: ', data['points'][0]['customdata']);
      rows[this.clickedUnitId].scrollIntoView({
                                      behavior: 'smooth',
                                      block: 'center'});
    }

  }

  clusterSelectedTable(unit_id) {
    // console.log('table row selected!')
    const element = this.el_nav.nativeElement.children[1];
    const rows = element.querySelectorAll('tr');
    this.clickedUnitId = unit_id;
    this.targetUnitId = this.clickedUnitId;
 
  }

  navigate_cell_plots(event, direction) {
    // console.log('navigation activated')
    // let element = this.el_nav.nativeElement.children[1];
    // let rows = element.querySelectorAll('tr');
    // let HLrowID = element.querySelectorAll('#highlighted-row');
    // console.log('element: ', element)
    // console.log('rows: ', rows)
    // console.log('highlighted id: ', HLrowID)
    // console.log('highlighted id[0]: ', HLrowID[0])
    // console.log('highlighted id[0] type: ', typeof HLrowID[0])
    // console.log('highlighted id[0][outerText]: ', HLrowID[0]['outerText'])
    // console.log('=============================')
    // rows.forEach((row, index) => {
    //   if (row.id == 'highlighted-row') {
    //     console.log('highlighted row at index - ', index)
    //     console.log('highlighted row at rowindex - ', row['rowIndex'])
    //     console.log('unit - ', row['outerText'].split('')[2])
    //   }
    // })
    
    // console.log('clickedUnitId before - ', this.clickedUnitId);
    if (direction === 'up') {
      if (this.clickedUnitId - 1 > -1) {
        this.clickedUnitId -= 1;
        this.targetUnitId = this.clickedUnitId;
      }
      // console.log('clickedUnitId after - ', this.clickedUnitId);
    }
    if (direction === 'down') {
      if (this.clickedUnitId + 1 < this.plot_data[0]['x'].length + 1) {
        this.clickedUnitId += 1;
        this.targetUnitId = this.clickedUnitId;
      }
      // console.log('clickedUnitId after - ', this.clickedUnitId);
    }
  }

  // sortData(sort: Sort) {
  //   const data = this.cellsByProbeIns.slice();
  //   if (!sort.active || sort.direction === '') {
  //     this.sortedCellsByProbeIns = data;
  //     return;
  //   }

  //   this.sortedCellsByProbeIns = data.sort((a, b) => {
  //     const isAsc = sort.direction === 'asc';
  //     switch (sort.active) {
  //       case 'unit': return compare(a.unit, b.unit, isAsc);
  //       case 'unit_depth': return compare(a.unit_depth, b.unit_depth, isAsc);
  //       case 'unit_amp': return compare(a.unit_amp, b.unit_amp, isAsc);
  //       case 'unit_posx': return compare(a.unit_posx, b.unit_posx, isAsc);
  //       case 'unit_posy': return compare(a.unit_posy, b.unit_posy, isAsc);
  //       default: return 0;
  //     }
  //   })
  // } 
}

function compare(a: number | string, b: number | string, isAsc: boolean) {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}
