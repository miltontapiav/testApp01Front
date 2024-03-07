import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError, BehaviorSubject, Subject} from 'rxjs';
import { environment } from '../../../environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class DatosService {
  private incidentDataSubject: Subject<any> = new Subject<any>();
  incidentData$ = this.incidentDataSubject.asObservable();

  constructor(
    private http: HttpClient    
  ) { }

  getIncidentData(estado: string, fechaIni: string, fechaFin: string, nroCliente: string): Observable<any> {
    const token = localStorage.getItem('token');

    if (!token) {
      console.error('No se encontró un token en el almacenamiento local');
      return;
    }
    
    estado = estado || '';

    const params = new HttpParams()
      .set('estado', estado)
      .set('fechaIni', fechaIni)
      .set('fechaFin', fechaFin)
      .set('nroCliente', nroCliente);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: token,
    });

    this.http.get(`${environment.apiUrl}/api/dashboard`, { params, headers }).subscribe(
      (response: any) => {

        this.incidentDataSubject.next(response.responseData.instrucciones);

      },
      (error) => {
        console.error('Error en la solicitud del dashboard:', error);
      }
    );
  }

  updateIncidentData(updatedData: any): Observable<any> {
    const token = localStorage.getItem('token');

    if (!token) {
      console.error('No se encontró un token en el almacenamiento local');
      return new Observable();
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });

    return this.http.put(`${environment.apiUrl}/api/modal`, updatedData, { headers });

  }
  
}
