import { Component, OnInit, OnDestroy, ElementRef, ViewChild, Input, HostListener } from '@angular/core';


@Component({
  selector: 'app-probe-insertion',
  templateUrl: './probe-insertion.component.html',
  styleUrls: ['./probe-insertion.component.css']
})
export class ProbeInsertionComponent implements OnInit {
  probeInsertion: any;
  zoomProbeInsPlotPlotURL;
  showProbeInsPlotModal = false;
  checkmarkMap: any = {'0': '', '1': '\u2714'};

  @Input() probeInsertionInfo: Object;
  constructor() { }

  ngOnInit() {
    this.probeInsertion = this.probeInsertionInfo;
  }

  toggleProbeInsPlotModal = (plotURL) => {
    this.zoomProbeInsPlotPlotURL = plotURL;
    this.showProbeInsPlotModal = !this.showProbeInsPlotModal;
  }

}
