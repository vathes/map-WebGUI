import { Component, OnInit, OnDestroy, ElementRef, ViewChild, Input, DoCheck, HostListener} from '@angular/core';

import { Subscription } from 'rxjs';

import { CellListService, RegionColorService } from './cell-list.service';

import { Sort } from '@angular/material/sort';


@Component({
  selector: 'app-cell-list',
  templateUrl: './cell-list.component.html',
  styleUrls: ['./cell-list.component.css']
})

export class CellListComponent implements OnInit, OnDestroy, DoCheck {
  cells: any;
  annotatedElectrodes: any;
  session: any;
  clickedUnitId: number;
  clickedUnitIndex: number;
  cellsByProbeIns = [];
  sortedCellsByProbeIns = [];

  plot_unit_data;
  plot_region_data;

  plot_data;
  plot_layout;
  plot_config;

  targetClusterRowInfo = [];
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
    this.clickedUnitIndex = 0;
    let probeCount = 0;
    while (probeCount < this.sessionInfo['probe_count']) {
      this.probeInsertions.push(probeCount + 1);
      probeCount++;
    }

    // === Define static plot_layout and plot_config
    this.plot_layout = {
      // autosize: false,
      width: 400,
      height: 600,
      yaxis: {
        title: 'Unit Depth (µm)',
        autorange: false,
        range: [-1000, 0]
      },
      xaxis: {
        title: 'Unit x position (µm)',
        autorange: false,
        range: [0, 100]
      },
      hovermode: 'closest',
      showlegend: true,
      legend: {
        x: -0.1,
        y: -0.2
      },
      barmode: 'stack'
    };
    this.plot_config = {
      showLink: false,
      showSendToCloud: false,
      displaylogo: false,
      modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d', 'hoverClosestCartesian',
                      'hoverCompareCartesian', 'toImage', 'toggleSpikelines'],
    };
    console.log('Setup plot_layout: ', this.plot_layout);

    // === Query unit data to build plot data
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
          this.sortedCellsByProbeIns = this.cellsByProbeIns;
          this.clickedUnitId = 1;
          this.makePlotUnitData(x_data, y_data, id_data, color_data, size_data);
          this.makePlotData();
        }
      });

    this.cellListService.retrieveRegionColor(cellsQuery);
    this.cellListSubscription = this.cellListService.getRegionColorLoadedListener()
      .subscribe((annotatedElectrodes) => {
        // console.log('logging retrieved region color data: ', annotatedElectrodes);
        if (Object.entries(annotatedElectrodes).length > 0) {
          this.annotatedElectrodes = annotatedElectrodes;
          let x_rdata = [];
          let y_rdata = [];
          let width_rdata = [];
          let color_rdata = [];

          for (let entry of Object.values(annotatedElectrodes)) {
            if (entry['insertion_number'] == 1) {
              x_rdata= entry['x'];
              y_rdata= entry['y'];
              width_rdata= entry['width'];
              color_rdata= entry['color'];
            }
          }
          this.makePlotRegionData(x_rdata, y_rdata, width_rdata, color_rdata);
          this.makePlotData();
        }
      });
  }

  ngDoCheck() {
    const markerColors = [];
    if (this.plot_unit_data) {
      if (this.plot_unit_data['x'] && this.clickedUnitIndex > -1) {
        for (let i = 0; i < this.plot_unit_data['x'].length; i++) {
          if (this.clickedUnitIndex === i) {
            markerColors.push('rgba(0, 0, 0, 1)'); // black
          } else {
            markerColors.push(this.color_data_adjusted[i]); 
            // markerColors.push(this.test_color_data[i]); 
          }
        }
      } else {
        for (let i = 0; i < this.plot_unit_data['x'].length; i++) {
          markerColors.push(this.color_data_adjusted[i]);
          // markerColors.push(this.test_color_data[i]); 
        }
      }
      this.plot_unit_data['marker']['line']['color'] = markerColors;
      // console.log('markerColors: ', markerColors);
    }
  }

  ngOnDestroy() {
    if (this.cellListSubscription) {
      this.cellListSubscription.unsubscribe();
    }

  }

  makePlotUnitData(x_data, y_data, id_data, color_data, size_data) {
      this.size_data_adjusted = size_data.map(function(el) {
        return 8 + (12 * (el - Math.min(...size_data))/(Math.max(...size_data)) - Math.min(...size_data));
      });

      this.test_color_data = color_data.map(function(item) {
        return (item - Math.min(...color_data)) / (Math.max(...color_data) - Math.min(...color_data));
      });

      this.color_data_adjusted = color_data.map(function(elem) {
        return `rgba(0, 125, ${255 * (elem - Math.min(...color_data)) / (Math.max(...color_data) - Math.min(...color_data))}, 0.33)`
      });

      this.plot_unit_data = {
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
                width: 2,
              },
              colorbar: {
                thickness: 10,
                title: 'Unit Amp (µV)'
              },
              cmax: Math.max(...color_data),
              cmin: Math.min(...color_data),
              colorscale: [['0.0','rgba(0, 125, 0, 0.33)'], ['1.0','rgba(0, 125, 255, 0.33)']]
            }
          };
      console.log('plot_unit_data updated');
    }

  makePlotRegionData(x_data, y_data, width_data, color_data){
    this.plot_region_data = {
      x: x_data,
      y: y_data,
      width: width_data,
      marker: {
        color: color_data,
        opacity: 0.4
      },
      type: 'bar',
      showlegend: false,
      hoverinfo: 'none'
    };
    console.log('plot_region_data updated');
  }

  makePlotData(){
    this.plot_data = [this.plot_unit_data, this.plot_region_data];

    if (this.plot_unit_data){
      console.log('update axes ranges')
      var x_min = Math.min(...this.plot_unit_data['x'])
      var x_max = Math.max(...this.plot_unit_data['x'])
      var y_min = Math.min(...this.plot_unit_data['y'])
      var y_max = Math.max(...this.plot_unit_data['y'])

      this.plot_layout['xaxis']['range'] = [x_min - (x_max - x_min)*0.2, x_max + (x_max - x_min)*0.2];
      this.plot_layout['yaxis']['range'] = [y_min - (y_max - y_min)*0.1, y_max + (y_max - y_min)*0.1];
    }

    console.log('this.plot_data: ', this.plot_data);
    console.log('this.plot_layout: ', this.plot_layout);
  }

  get_probe_unit(probeInsNum) {
    let cellsQuery = this.session;
    cellsQuery['is_all'] = 0;
    cellsQuery['insertion_number'] = probeInsNum;
    // this.cellListService.retrieveCellList(this.sessionInfo);
    this.cellListService.retrieveCellList(cellsQuery);
    this.cellListSubscription = this.cellListService.getCellListLoadedListener()
      .subscribe((cellListData) => {
        if (Object.entries(cellListData).length > 0) {
          this.cells.push(...cellListData);
        }
      });
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

    let x_rdata = [];
    let y_rdata = [];
    let width_rdata = [];
    let color_rdata = [];

    for (let entry of Object.values(this.annotatedElectrodes)) {
      if (entry['insertion_number'] == probeInsNum) {
        x_rdata= entry['unit_depth'];
        y_rdata= entry['unit_depth'];
        width_rdata= entry['unit_depth'];
        color_rdata= entry['unit_depth'];
      }
    }

    this.sortedCellsByProbeIns = this.cellsByProbeIns;

    this.makePlotUnitData(x_data, y_data, id_data, color_data, size_data);
    this.makePlotRegionData(x_rdata, y_rdata, width_rdata, color_rdata);

    this.unitBehaviorLoading = false;
    this.unitPsthLoading = false;
    this.clickedUnitId = 1;

    this.makePlotData();
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
    // console.log('clicked unitId is: ', this.clickedUnitId);
    if (data['points'] && data['points'][0]['customdata']) {
      // console.log('data[points][0] is: ', data['points'][0]);
      this.clickedUnitId = data['points'][0]['customdata'];
      // for (const [ind, row] of Object.entries(rows)) {
      //   // console.log('row inner text is - ', row['innerText']);
      //   if (this.clickedUnitId == row['innerText'].split('	')[0]) {
      //     console.log('row1 is: ', row)
      //     console.log('row unit id is - ', row['innerText'].split('	')[0]);
      //     const unitId = row['innerText'].split('	')[0];
      //     this.clickedUnitIndex = parseInt(ind, 10);
      //     row.scrollIntoView({
      //       behavior: 'smooth',
      //       block: 'center'
      //     });
      //   } 
      // }
      let rowIndex = 0;
      for (const row of rows) {
        // console.log('inside second loop');
        if (this.clickedUnitId == row['innerText'].split('	')[0]) {
          // console.log('row2 is: ', row)
          // console.log('row unit2 id is - ', row['innerText'].split('	')[0]);
          this.clickedUnitIndex = rowIndex;
          // console.log('index 2 - ', rowIndex);
          row.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
        rowIndex += 1; 
      }
      
      // rows[this.clickedUnitId].scrollIntoView({
      //                                 behavior: 'smooth',
      //                                 block: 'center'});
    }

  }

  clusterSelectedTable(unit_id) {

    for (const [index, unit] of Object.entries(this.cellsByProbeIns)) {
      if (unit['unit'] === unit_id) {
        
        this.clickedUnitIndex = parseInt(index, 10);
        this.clickedUnitId = unit_id;
      }
    }
    // const element = this.el_nav.nativeElement.children[1];
    // const rows = element.querySelectorAll('tr');
    // this.clickedUnitId = unit_id;
 
  }

  navigate_cell_plots(event, direction) {
    if (direction === 'up') {
      if (this.clickedUnitIndex - 1 > -1) {
        this.clickedUnitIndex -= 1;
        
      }
    }
    if (direction === 'down') {
      if (this.clickedUnitIndex + 1 < this.plot_data[0]['x'].length + 1) {
        this.clickedUnitIndex += 1;
      }
    }
    // console.log('this.cellsByProbeIns[this.clickedUnitId][unit]: ', this.cellsByProbeIns[this.clickedUnitIndex]['unit'])
    this.clickedUnitId = this.cellsByProbeIns[this.clickedUnitIndex]['unit'];
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
