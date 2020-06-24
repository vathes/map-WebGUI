import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../environments/environment';

const BACKEND_API_URL = environment.backend_url;

@Injectable({
  providedIn: 'root'
})
export class AllSessionsService {
  private allSessions;
  private allSessionMenu;
  private sessionMenu;
  private sessionMenuLoaded = new Subject();
  private allSessionMenuLoaded = new Subject();
  private sessionsLoaded = new Subject();

  private retrievedSessions;
  private newSessionsLoaded = new Subject();

  private retrievedSessions2;
  private newSessionsLoaded2 = new Subject();

  private retrievedOneSession;
  private oneSessionLoaded = new Subject();

  constructor(private http: HttpClient) { }

  getAllSessions() {
    this.http.get(BACKEND_API_URL + `/sessions`)
      .subscribe((allSessionsData) => {
        this.allSessions = allSessionsData;
        // console.log(this.allSessions);
        this.sessionsLoaded.next(this.allSessions);
      });
  }
  getAllSessionMenu(sessionsFilter) {
    // console.log('creating initial menu - POSTing for:', sessionsFilter);
    this.http.post(BACKEND_API_URL + `/sessions/`, sessionsFilter, { responseType: 'json' })
      .subscribe(
        (filteredSessionsData) => {
          this.allSessionMenu = filteredSessionsData;
          this.allSessionMenuLoaded.next(this.allSessionMenu);
        },
        (err: any) => {
          console.log('err in fetching requested menu');
          console.error(err);
        }
      );
  }

  getSessionMenu(sessionsFilter) {
    // console.log('POSTing for:', sessionsFilter);
    this.http.post(BACKEND_API_URL + `/sessions/`, sessionsFilter, { responseType: 'json' })
      .subscribe(
        (filteredSessionsData) => {
          this.sessionMenu = filteredSessionsData;
          // console.log('retrieved session menu data are: ');
          // console.log(this.sessionMenu);
          this.sessionMenuLoaded.next(this.sessionMenu);
        },
        (err: any) => {
          console.log('err in fetching requested menu');
          console.error(err);
        }
      );
  }

  retrieveSessions(sessionsFilter) {
    // console.log('retrieving sessions POSTing for:', sessionsFilter);
    this.http.post(BACKEND_API_URL + `/sessions/`, sessionsFilter, { responseType: 'json' })
      .subscribe(
        (filteredSessionsData) => {
          this.retrievedSessions = filteredSessionsData;
          this.newSessionsLoaded.next(this.retrievedSessions);
        },
        (err: any) => {
          console.log('err in fetching requested sessions');
          console.error(err);
        }
      );
  }

  retrieveSessions2(sessionsFilter) {
    // console.log('POSTing for:', sessionsFilter);
    this.http.post(BACKEND_API_URL + `/sessions/`, sessionsFilter, { responseType: 'json' })
      .subscribe(
        (filteredSessionsData) => {
          this.retrievedSessions2 = filteredSessionsData;
          // console.log('retrievedSessions data are: ');
          // console.log(this.retrievedSessions);
          this.newSessionsLoaded2.next(this.retrievedSessions2);
        },
        (err: any) => {
          console.log('err in fetching requested sessions');
          console.error(err);
        }
      );
  }

  retrieveOneSession(sessionsFilter) {
  // console.log('POSTing for:', sessionsFilter);
    this.http.post(BACKEND_API_URL + `/session/`, sessionsFilter, { responseType: 'json' })
      .subscribe(
        (filteredSessionsData) => {
          this.retrievedOneSession = filteredSessionsData;
          this.oneSessionLoaded.next(this.retrievedOneSession);
        },
        (err: any) => {
          console.log('err in fetching requested session');
          console.error(err);
        }
      );
  }


  getSessionsLoadedListener() {
    return this.sessionsLoaded.asObservable();
  }

  getAllSessionMenuLoadedListener() {
    return this.allSessionMenuLoaded.asObservable();
  }

  getSessionMenuLoadedListener() {
    return this.sessionMenuLoaded.asObservable();
  }

  getNewSessionsLoadedListener() {
    return this.newSessionsLoaded.asObservable();
  }
  getNewSessionsLoadedListener2() {
    return this.newSessionsLoaded2.asObservable();
  }
  getOneSessionLoadedListener() {
    return this.oneSessionLoaded.asObservable();
  }

}


