import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as PlotlyJS from 'plotly.js/dist/plotly.js';
import { PlotlyModule } from 'angular-plotly.js';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Routes, RouterModule } from '@angular/router';
import { MatSelectModule,
         MatAutocompleteModule,
         MatIconModule,
         MatInputModule,
         MatCheckboxModule,
         MatRadioModule,
         MatNativeDateModule,
         MatDatepickerModule,
         MatSlideToggleModule,
         MatCardModule,
         MatButtonModule,
         MatTableModule,
         MatPaginatorModule,
         MatSortModule,
         MatSliderModule,
         MatExpansionModule,
         MatDialogModule } from '@angular/material';
import { MatMomentDateModule, MAT_MOMENT_DATE_ADAPTER_OPTIONS } from '@angular/material-moment-adapter';
import { FlexLayoutModule } from '@angular/flex-layout';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';


import { AuthGuard } from './auth/auth-guard.service';
import { AppComponent } from './app.component';
import { LoginComponent } from './auth/login/login.component';
import { AuthService } from './auth/auth.service';
import { SessionListComponent } from './session-list/session-list.component';
import { SessionComponent } from './session-list/session/session.component';
// import { MouseListComponent } from './mouse-list/mouse-list.component';
// import { MouseComponent } from './mouse-list/mouse/mouse.component';
import { CellListComponent } from './cell-list/cell-list.component';
import { CellComponent } from './cell-list/cell/cell.component';
import { OverviewComponent } from './overview/overview.component';
import { AuthInterceptor } from './auth/auth-interceptor';
import { ProbeInsertionListComponent } from './probe-insertion-list/probe-insertion-list.component';
import { ProbeInsertionComponent } from './probe-insertion-list/probe-insertion/probe-insertion.component';
import { ProbeTracksComponent } from './probe-tracks/probe-tracks.component';

PlotlyModule.plotlyjs = PlotlyJS;

const appRoutes: Routes = [
  { path: '', component: OverviewComponent, canActivate: [AuthGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'cells', component: CellListComponent },
  // {
  //   path: 'mouse/:mouseUUID',
  //   canActivate: [AuthGuard],
  //   canActivateChild: [AuthGuard],
  //   component: MouseComponent
  // },
  // {
  //   path: 'mice',
  //     canActivate: [AuthGuard],
  //     canActivateChild: [AuthGuard],
  //     component: MouseListComponent
  // },
  {
    path: 'probe',
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    children: [{
      path: ':mouseID',
      children: [{
        path: ':sessionID',
        children: [{
          path: ':insertionNum',
          component: CellComponent
        }]
      }]
    }]
  },
  {
    path: 'session/:mouseID/:sessionID',
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    component: SessionComponent
  },
  {
    path: 'sessions',
      canActivate: [AuthGuard],
      canActivateChild: [AuthGuard],
      component: SessionListComponent
  },
  {
    path: 'project-probe-tracks',
    canActivate: [AuthGuard],
    component: ProbeTracksComponent
  }
  // { path: 'not-found', component: ErrorPageComponent, data: { message: '404 - Page not found!' } },
  // { path: '**', redirectTo: '/not-found' }
];


@NgModule({
  // entryComponents: [SessionComponent, SessionPlotDialog],
  entryComponents: [SessionComponent],
  declarations: [
    AppComponent,
    LoginComponent,
    SessionListComponent,
    SessionComponent,
    // MouseListComponent,
    // MouseComponent,
    CellListComponent,
    CellComponent,
    OverviewComponent,
    ProbeInsertionListComponent,
    ProbeInsertionComponent,
    ProbeTracksComponent
  ],
  imports: [
    CommonModule, PlotlyModule,
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    HttpClientModule,
    RouterModule.forRoot(appRoutes),
    MatSelectModule, MatAutocompleteModule, MatIconModule, MatInputModule,
    MatCheckboxModule, MatRadioModule, MatNativeDateModule, MatDatepickerModule, MatMomentDateModule, MatSlideToggleModule,
    MatCardModule, MatButtonModule, MatTableModule, MatPaginatorModule, MatSortModule, MatSliderModule, MatExpansionModule,
    MatDialogModule, ReactiveFormsModule, FlexLayoutModule
  ],
  providers: [AuthService, AuthGuard,
              { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
              { provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS, useValue: { useUtc: true } }
             ],
  bootstrap: [AppComponent]
})
export class AppModule { }
