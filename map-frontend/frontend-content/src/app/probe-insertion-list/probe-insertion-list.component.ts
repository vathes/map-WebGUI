import { Component, OnInit, OnDestroy, ElementRef, ViewChild, Input, HostListener } from '@angular/core';

import { Subscription } from 'rxjs';

import { ProbeInsertionListService } from './probe-insertion-list.service';


@Component({
  selector: 'app-probe-insertion-list',
  templateUrl: './probe-insertion-list.component.html',
  styleUrls: ['./probe-insertion-list.component.css']
})
export class ProbeInsertionListComponent implements OnInit {
  probeInsertions: any;
  session: any;

  private probeInsertionListSubscription: Subscription;;
  @Input() sessionInfo: Object;
  constructor(public probeInsertionListService: ProbeInsertionListService) { }

  ngOnInit() {
    this.session = this.sessionInfo
    this.probeInsertionListService.retrieveProbeInsertions(this.sessionInfo);
    this.probeInsertionListSubscription = this.probeInsertionListService.getProbeInsertionListLoadedListener()
      .subscribe((probeInsData) => {
        this.probeInsertions = probeInsData;
        console.log('printing probe insertion data: ', probeInsData);
      })

  }

}
