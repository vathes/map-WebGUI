import { Component, OnInit, OnDestroy, ViewChild, Inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AllSessionsService } from '../all-sessions.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-session',
  templateUrl: './session.component.html',
  styleUrls: ['./session.component.css']
})
export class SessionComponent implements OnInit, OnDestroy {
  public session_id;
  public mouse_id;
  private sessionSubscription: Subscription;
  session: any;
  sessionPlotInfo: any;

  constructor(private route: ActivatedRoute, public allSessionsService: AllSessionsService) { }


  ngOnInit() {
    this.session_id = this.route.snapshot.paramMap.get('sessionID');
    this.mouse_id = this.route.snapshot.paramMap.get('mouseID');
    this.allSessionsService.retrieveSessions({'session': parseInt(this.session_id), 'subject_id': parseInt(this.mouse_id)});
    this.sessionSubscription = this.allSessionsService.getNewSessionsLoadedListener()
    .subscribe((session: any) => {
      this.session = session[0];
    });
  }

  ngOnDestroy() {
    if (this.sessionSubscription) {
      this.sessionSubscription.unsubscribe();
    }
  }


}

