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
  cells = [];
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

  eventType;
  selectedProbeIndex;
  selectedShank;

  showController = true;

  // color_data_adjusted_old;
  color_data_adjusted;
  size_data_adjusted;
  test_color_data;

  probeInsertions = [];

  driftmapByProbe;
  coronalsliceByProbe;

  unitBehaviorLoading = true;
  unitPsthLoading = true;

  private cellListSubscriptions;
  private regionColorSubscription: Subscription;
  private driftmapSubscription: Subscription;
  private coronalsliceSubscription: Subscription;
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
    this.driftmapByProbe = {};
    this.coronalsliceByProbe = {};
    this.cellListSubscriptions = {};
    for (let insert_str of this.sessionInfo['probe_insertions'].split(',')){
      this.probeInsertions.push(parseInt(insert_str));
      this.driftmapByProbe[parseInt(insert_str)] = {};
      this.coronalsliceByProbe[parseInt(insert_str)] = {};
      this.cellListSubscriptions[parseInt(insert_str)] = Subscription;
    }

    this.selectedProbeIndex = this.probeInsertions[0]

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

    // === Query region color data
    console.log('Request region color data');
    this.cellListService.retrieveRegionColor(this.sessionInfo);
    this.regionColorSubscription = this.cellListService.getRegionColorLoadedListener()
      .subscribe((annotatedElectrodes) => {
        console.log('Retrieve region color data');
        if (Object.entries(annotatedElectrodes).length > 0) {
          this.annotatedElectrodes = annotatedElectrodes;
          let x_rdata = [];
          let y_rdata = [];
          let width_rdata = [];
          let color_rdata = [];
          let anno_rdata = [];
          for (let entry of Object.values(annotatedElectrodes)) {
            if (entry['insertion_number'] == this.selectedProbeIndex) {
              x_rdata = entry['x'];
              y_rdata = entry['y'];
              width_rdata = entry['width'];
              color_rdata = entry['color'];
              anno_rdata = entry['annotation'];
            }
          }
          this.makePlotRegionData(x_rdata, y_rdata, width_rdata, color_rdata, anno_rdata);
          this.makePlotData();
        }
      });

    // === Query unit data to build plot data for first available probe
    let cellsQuery = {...this.session, 'is_all': 0, 'insertion_number': this.selectedProbeIndex};
    // this.cellListService.retrieveCellList(this.sessionInfo);
    console.log('Request units for probe insertion: ', this.selectedProbeIndex);
    this.cellListService.retrieveCellList(cellsQuery);
    this.cellListSubscriptions[this.selectedProbeIndex] = this.cellListService.getCellListLoadedListener(this.selectedProbeIndex)
      .subscribe((cellListData) => {
        this.unitBehaviorLoading = false;
        this.unitPsthLoading = false;
        console.log('Retrieve units for initial probe insertion: ', this.selectedProbeIndex);
        if (Object.entries(cellListData).length > 0) {
          this.cells.push(...Object.values(cellListData));
          const x_data = [];
          const y_data = [];
          const id_data = [];
          const size_data = [];
          const color_data = [];
          this.cellsByProbeIns = [];
          for (let entry of Object.values(cellListData)) {
            id_data.push(entry['unit']);
            size_data.push(entry['avg_firing_rate']);
            y_data.push(entry['unit_depth']);
            x_data.push(entry['unit_posx']);
            color_data.push(entry['unit_amp']);
            this.cellsByProbeIns.push(entry);
          }
          this.sortedCellsByProbeIns = this.cellsByProbeIns;
          this.clickedUnitId = 1;
          this.makePlotUnitData(x_data, y_data, id_data, color_data, size_data);
          this.makePlotData();
        }
        
      });

    // === Query driftmap
    console.log('Request driftmap data');
    this.cellListService.retrieveDriftmap(this.sessionInfo);
    this.driftmapSubscription = this.cellListService.getDriftmapLoadedListener()
      .subscribe((driftmapData:[]) => {
        console.log('Retrieve driftmap data')
        if (driftmapData) {
          for (let entry of driftmapData) {
            this.driftmapByProbe[entry['insertion_number']][entry['shank']] = entry['driftmap']
          }
        }
        console.log('driftmap by probe: ', this.driftmapByProbe);
        this.selectedShank = 1;
      })

    // === Query coronal slice
    console.log('Request coronal slice data');
    this.cellListService.retrieveCoronalSlice(this.sessionInfo);
    this.coronalsliceSubscription = this.cellListService.getCoronalsliceLoadedListener()
      .subscribe((coronalsliceData:[]) => {
        console.log('Retrieve coronal slice data')
        if (coronalsliceData) {
          for (let entry of coronalsliceData) {
            this.coronalsliceByProbe[entry['insertion_number']][entry['shank']] = entry['coronal_slice']
          }
        }
        console.log('coronal slice by probe: ', this.coronalsliceByProbe);
      })


    // === Query unit data for the remaining probes
    for (let probeInsNum of this.probeInsertions.slice(1, )) {
      console.log('Request units for probe insertion: ', probeInsNum);
      this.getProbeUnits(probeInsNum);
    }

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
    for (let key in this.cellListSubscriptions) {
          if (this.cellListSubscriptions[key]) {
            this.cellListSubscriptions[key].unsubscribe();
          }
    }

    if (this.regionColorSubscription) {
      this.regionColorSubscription.unsubscribe();
    }

    if (this.driftmapSubscription) {
      this.driftmapSubscription.unsubscribe();
    }

  }

  makePlotUnitData(x_data, y_data, id_data, color_data, size_data) {
      this.size_data_adjusted = size_data.map(function(el) {
        return 8 + (12 * (el - Math.min(...size_data))/(Math.max(...size_data)) - Math.min(...size_data));
      });

      this.test_color_data = color_data.map(function(item) {
        return (item - Math.min(...color_data)) / (Math.max(...color_data) - Math.min(...color_data));
      });

      // this.color_data_adjusted_old = color_data.map(function(elem) {
      //   return `rgba(0, 125, ${255 * (elem - Math.min(...color_data)) / (Math.max(...color_data) - Math.min(...color_data))}, 0.33)`

      // });
      this.color_data_adjusted = color_data.map(function(elem) {
        return `rgba(255, ${130 + (125 * (elem - Math.min(...color_data)) / (Math.max(...color_data) - Math.min(...color_data)))}, ${255 * (elem - Math.min(...color_data)) / (Math.max(...color_data) - Math.min(...color_data))}, 0.53)`

      });
      // console.log('min_color_data: ', Math.min(...color_data));
      // console.log('max_color_data: ', Math.max(...color_data));
      // console.log('color_data_adjusted_old: ', this.color_data_adjusted_old);
      // console.log('color_data_adjusted: ', this.color_data_adjusted);
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
              // colorscale: [['0.0','rgba(0, 125, 0, 0.33)'], ['1.0','rgba(0, 125, 255, 0.33)']] // green-blue scale
              colorscale: [['0.0','rgba(255, 130, 0, 0.33)'], ['1.0','rgba(255, 255, 0, 0.33)']] // orange-yellow scale
            }
          };
      console.log('plot_unit_data updated');
    }

  makePlotRegionData(x_data, y_data, width_data, color_data, anno_data){
    this.plot_region_data = {
      x: x_data,
      y: y_data,
      width: width_data,
      text: anno_data,
      marker: {
        color: color_data,
        opacity: 0.6
      },
      type: 'bar',
      showlegend: false,
      hoverinfo: 'text'
    };
    console.log('plot_region_data updated');
  }

  makePlotData(){
    if (this.plot_unit_data){
      console.log('Build interactive plot');
      var x_min = Math.min(...this.plot_unit_data['x']);
      var x_max = Math.max(...this.plot_unit_data['x']);
      var y_min = Math.min(...this.plot_unit_data['y']);
      var y_max = Math.max(...this.plot_unit_data['y']);

      this.plot_layout['xaxis']['range'] = [x_min - (x_max - x_min)*0.2, x_max + (x_max - x_min)*0.2];
      this.plot_layout['yaxis']['range'] = [y_min - (y_max - y_min)*0.09, y_max + (y_max - y_min)*0.11];

      this.plot_data = [this.plot_unit_data, this.plot_region_data];

      console.log('this.plot_data: ', this.plot_data);
      console.log('this.plot_layout: ', this.plot_layout);
    }
  }

  getProbeUnits(probeInsNum) {
    let cellsQuery = this.session;
    cellsQuery['is_all'] = 0;
    cellsQuery['insertion_number'] = probeInsNum;

    this.cellListService.retrieveCellList(cellsQuery);
    this.cellListSubscriptions[probeInsNum] = this.cellListService.getCellListLoadedListener(probeInsNum)
      .subscribe((cellListData) => {
        console.log('Retrieve units for probe insertion: ', probeInsNum);
        if (Object.entries(cellListData).length > 0) {
          this.cells.push(...Object.values(cellListData));
        }
      });
  }
  
  probe_selected(probeInsNum) {
    this.unitBehaviorLoading = true;
    this.unitPsthLoading = true;
    console.log('probe insertions selected: ', probeInsNum);
    this.selectedProbeIndex = probeInsNum;
    if (this.driftmapByProbe[this.selectedProbeIndex]) {
      this.selectedShank = 1;
    } else {
      this.selectedShank = null;
    }

    const x_data = [];
    const y_data = [];
    const id_data = [];
    const size_data = [];
    const color_data = [];
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
    let anno_rdata = [];
    for (let entry of Object.values(this.annotatedElectrodes)) {
      if (entry['insertion_number'] == probeInsNum) {
        x_rdata = entry['x'];
        y_rdata = entry['y'];
        width_rdata = entry['width'];
        color_rdata = entry['color'];
        anno_rdata = entry['annotation'];
      }
    }

    this.sortedCellsByProbeIns = this.cellsByProbeIns;

    this.makePlotUnitData(x_data, y_data, id_data, color_data, size_data);
    this.makePlotRegionData(x_rdata, y_rdata, width_rdata, color_rdata, anno_rdata);
    this.unitBehaviorLoading = false;
    this.unitPsthLoading = false;
    this.clickedUnitId = 1;

    this.makePlotData();
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
