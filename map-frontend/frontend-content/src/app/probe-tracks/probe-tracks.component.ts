import { Component, OnInit, OnDestroy } from '@angular/core';

import { Subscription } from 'rxjs';

import { ProbeTracksService } from './probe-tracks.service';


@Component({
  selector: 'app-probe-tracks',
  templateUrl: './probe-tracks.component.html',
  styleUrls: ['./probe-tracks.component.css']
})

export class ProbeTracksComponent implements OnInit, OnDestroy {
  probeTracks: any;

  private probeTracksSubscription: Subscription;;
  constructor(public probeTracksService: ProbeTracksService) { }

  ngOnInit() {
    this.probeTracksService.retrieveprobeTracks();
    this.probeTracksSubscription = this.probeTracksService.getprobeTracksLoadedListener()
      .subscribe((probeTracksData) => {
        this.probeTracks = probeTracksData[0];
        // console.log('printing probe tracks data: ', probeTracksData);
      })

  }

  ngOnDestroy() {
    if (this.probeTracksSubscription) {
      this.probeTracksSubscription.unsubscribe();
    }
  }

}
