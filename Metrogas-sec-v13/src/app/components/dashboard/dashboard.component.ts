import { Component, OnInit } from '@angular/core';
import { DatosService } from 'src/app/services/services/datos.service';
import { AuthService } from 'src/app/services/auth/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { ModalModifiRowComponent } from '../modal-modifi-row/modal-modifi-row.component';
import { NgClass, NgForOf, NgIf } from '@angular/common';
import { DatosCompartidosService } from 'src/app/services/services/datos-compartidos-service.service';
import { TimerService } from 'src/app/services/services/timer.service';
import { Subscription } from 'rxjs';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';


@Component({
  //standalone: true,
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  //imports: [ NgFor, NgIf, NgClass ],
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  incidentData: any[] = [];
  incidentDataTotal: any[] = [];
  estado: string = '';
  fechaIni: string = '';
  fechaFin: string = '';
  nroCliente: string = '';
  isRowSelected: boolean = false;
  selectedIncident: any;
  firstCol: boolean = true;
  datosFiltrados: any = {}; 
  FechaFormateadaFin: string = '';
  FechaFormateadaIni: string = '';
  formattedCountdown: string;
  tiempoRecibido: number = 0;
  private formattedCountdownSubscription: Subscription;
  pItemsPerPage: number = 10;
  page: number = 1;


  constructor(
    private datosService: DatosService,
    private datosCompartidosService: DatosCompartidosService,
    private dialog: MatDialog,
    private timerService: TimerService,
    private snackBar: MatSnackBar,
    private router: Router,
    public AuthService: AuthService,

  ) { 
    this.formattedCountdownSubscription = this.timerService.formattedCountdown$.subscribe(
      (formattedCountdown) => {
        this.formattedCountdown = formattedCountdown;
      }
    );
  }

  incidentHeaders: string[] = [
    'Suministro:   N° Cliente', 'N° Incidente Times', 'Oficio respuesta',
    'Fecha Oficio Resolución', 'Fecha Cumplimiento', 'Oficio PDF'
  ];
  
  incidentKeys: string[] = [
    '','idCasoTimes','nroOficioResolucion',
    'fechaOficioResolucion','fechaCumplimiento','urlPDF'
  ];
  
  ngOnInit(): void {
    this.timerService.countdown$.subscribe((remainingTime) => {
      this.tiempoRecibido = remainingTime;
      if (remainingTime <= 1) {
        this.mostrarVentanaEmergente('Sesión terminada, volviendo al login');
        this.router.navigate(['/login']);
        localStorage.removeItem('timerService.remainingTime');
      }
    });

    this.timerService.countdown$.subscribe((tiempo) => {
      this.tiempoRecibido = tiempo;
    });

    this.timerService.formattedCountdown$.subscribe(
      (formattedCountdown) => {
        this.formattedCountdown = formattedCountdown;
      }
    );
  
    this.datosCompartidosService.datosFiltrados$.subscribe((datos) => {
      if (datos && typeof datos === 'object') {
        this.datosFiltrados = datos;
        this.recibirDatosDelBuscador(this.datosFiltrados);

        const fechaOriginalini = this.datosFiltrados.fechaIni;
        this.convertirFormatoFechaIni(fechaOriginalini);

        const fechaOriginalFin = this.datosFiltrados.fechaFin;
        this.convertirFormatoFechaFin(fechaOriginalFin);

      } else {
        
        this.datosService.incidentData$.subscribe((data) => {
          this.incidentData = data;
        });

        this.datosService.getIncidentData(this.datosFiltrados.estado || '', this.FechaFormateadaIni, this.FechaFormateadaFin, this.datosFiltrados.nroCliente);

      }
    });
  }

  convertirFormatoFechaFin(_fecha: string) {
    const partesFecha = _fecha.split('-');
    const fechaOriginal = new Date(
      parseInt(partesFecha[0], 10),
      parseInt(partesFecha[1], 10) - 1,
      parseInt(partesFecha[2], 10)
    );
  
    fechaOriginal.setUTCHours(0, 0, 0, 0);
  
    const dia = fechaOriginal.getUTCDate().toString().padStart(2, '0');
    const mes = (fechaOriginal.getUTCMonth() + 1).toString().padStart(2, '0');
    const anio = fechaOriginal.getUTCFullYear();
  
    const fechaFormateadafin = `${mes}/${dia}/${anio}`;
  
    if (fechaFormateadafin == null || fechaFormateadafin == undefined || fechaFormateadafin == "NaN/NaN/NaN") {
      this.FechaFormateadaFin = ""
    } else {
      this.FechaFormateadaFin = fechaFormateadafin
    }
  }

  convertirFormatoFechaIni(_fecha: string) {
    const partesFecha = _fecha.split('-');
    const fechaOriginal = new Date(
      parseInt(partesFecha[0], 10),
      parseInt(partesFecha[1], 10) - 1,
      parseInt(partesFecha[2], 10)
    );
  
    fechaOriginal.setUTCHours(0, 0, 0, 0);
  
    const dia = fechaOriginal.getUTCDate().toString().padStart(2, '0');
    const mes = (fechaOriginal.getUTCMonth() + 1).toString().padStart(2, '0');
    const anio = fechaOriginal.getUTCFullYear();
  
    const fechaFormateadaini = `${mes}/${dia}/${anio}`;
    
    if (fechaFormateadaini == null || fechaFormateadaini == undefined || fechaFormateadaini == "NaN/NaN/NaN") {
      this.FechaFormateadaIni = ""
    } else {
      this.FechaFormateadaIni = fechaFormateadaini
    }
  }

  parseDateFromString(dateString: string): Date {
    const [day, month, year] = dateString.split('/').map(Number);
    return new Date(year, month - 1, day);
  }

  recibirDatosDelBuscador(datosFiltradosFilter: any): void {

    this.datosService.incidentData$.subscribe((data) => {
        this.incidentDataTotal = data;
  
        const estadoFiltrar: string | null = datosFiltradosFilter.estado;
        const nroClienteaFiltrar: string | null = datosFiltradosFilter.nroCliente;
        const fechaIniFiltrar: string | null = this.FechaFormateadaIni;
        const fechaFinFiltrar: string | null = this.FechaFormateadaFin;

        this.incidentData = this.incidentDataTotal.filter((incidente) => {
          let estadoCumplimientoCond: boolean;

          if (estadoFiltrar === '99') {
            estadoCumplimientoCond =
            !estadoFiltrar ||
            incidente.estadoCumplimiento === '00' ||
            incidente.estadoCumplimiento === '01' ||
            incidente.estadoCumplimiento === '02' ||
            incidente.estadoCumplimiento === '03' ||
            incidente.estadoCumplimiento === '04' ||
            incidente.estadoCumplimiento === '05' ||
            incidente.estadoCumplimiento === '06' ||
            incidente.estadoCumplimiento === '07' ||
            incidente.estadoCumplimiento === '08';
          } else if (estadoFiltrar === '') {
            estadoCumplimientoCond =
            !estadoFiltrar ||
            incidente.estadoCumplimiento === '02' ||
            incidente.estadoCumplimiento === '07';
          } else {
            estadoCumplimientoCond = !estadoFiltrar || incidente.estadoCumplimiento === estadoFiltrar;
          }
          const nroClienteCond = !nroClienteaFiltrar || incidente.nroCliente === nroClienteaFiltrar;

          const fechaIni = this.parseDateFromString(incidente.fechaOficioResolucion);
          const fechaFin = this.parseDateFromString(incidente.fechaCumplimiento);

          const fechaIniCond = !fechaIniFiltrar || fechaIni >= new Date(fechaIniFiltrar);
          const fechaFinCond = !fechaFinFiltrar || fechaFin <= new Date(fechaFinFiltrar);

          return estadoCumplimientoCond && nroClienteCond && fechaIniCond && fechaFinCond;
        });
    },
    (error) => {
      console.error('Error al actualizar datos:', error);
      this.mostrarVentanaEmergente('Error al traer datos');
    });

    this.datosService.getIncidentData(this.datosFiltrados.estado || '', this.FechaFormateadaIni, this.FechaFormateadaFin, this.datosFiltrados.nroCliente);

  }
  
  selectRow(incident: any) {
    this.selectedIncident = incident;
    this.isRowSelected = true;
  }

  openEditModal() {
    const modalRef = this.dialog.open(ModalModifiRowComponent);

    const incident = this.selectedIncident
    this.datosCompartidosService.changeIncident(incident)

    modalRef.afterClosed().subscribe((result) => {
      console.log('Modal cerrado con resultado:', result);
    });
  }

  private mostrarVentanaEmergente(mensaje: string): void {
    const config: MatSnackBarConfig = {
      duration: 4000, // Duración en milisegundos (opcional)
      horizontalPosition: 'center', // Posición horizontal ('start', 'center', 'end')
      verticalPosition: 'top', // Posición vertical ('top', 'bottom')
    };

    this.snackBar.open(mensaje, 'Cerrar', config);
  }

    /*
  case 201:
    this.mostrarVentanaEmergente('parametros erroneos');
    this.dialogRef.close(response);
    break;
  case 303:
    this.mostrarVentanaEmergente('Fecha de inicio mayor a la de término');
    this.dialogRef.close(response);
    break;
  case 304:
    this.mostrarVentanaEmergente('Estado no valido');
    this.dialogRef.close(response);
    break;
  case 303:
    this.mostrarVentanaEmergente('Fecha de inicio mayor a la de término');
    this.dialogRef.close(response);
    break;
*/

  descargarExcel(): void {
    const datosExportar = this.incidentData.map(incidente => ({
      'N° Incidente': incidente.idIncidente,
      'ID Referencia': incidente.idReferencia,
      'ID Caso Times': incidente.idCasoTimes,
      'ID Empresa': incidente.idEmpresa,
      'Motivo Reclamo': incidente.motivoReclamo,
      'Resultado Reclamo': incidente.resultadoReclamo,
      'N° Oficio Resolución': incidente.nroOficioResolucion,
      'Tipo Oficio Resolución': incidente.tipoOficioResolucion,
      'Fecha Oficio Resolución': incidente.fechaOficioResolucion,
      'URL PDF': incidente.urlPDF,
      'URL XML': incidente.urlXML,
      'Tipo Instrucción': incidente.tipoInstruccion,
      'Plazo': incidente.plazo,
      'Fecha Cumplimiento': incidente.fechaCumplimiento,
      'Estado Cumplimiento': incidente.estadoCumplimiento,
      'Observaciones SEC': incidente.observacionesSEC,
      'ID Reclamo Empresa': incidente.idReclamoEmpresa,
      'N° Cliente': incidente.nroCliente,
      'Región Reclamo': incidente.regionReclamo,
      'Comuna Reclamo': incidente.comunaReclamo,
      'Dirección Reclamo': incidente.direccionReclamo,
      'Coordenadas XY': incidente.coordenadasXY,
      'RUT Contacto': incidente.rutContacto,
      'Nombre Contacto': incidente.nombreContacto,
      'Apellido Paterno Contacto': incidente.apellidoPatContacto,
      'Apellido Materno Contacto': incidente.apellidoMatContacto,
      'Teléfono 1 Contacto': incidente.fono1Contacto,
      'Teléfono 2 Contacto': incidente.fono2Contacto,
      'Email Contacto': incidente.emailContacto,
  }));  

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosExportar);

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Incidentes');

    const wbArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'incidentes.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  onPageChange(event: number): void {
    this.page = event;
  }

  getCurrentRange(): string {
    const pageSize = 10;
    const startIndex = (this.page - 1) * pageSize + 1;
    const endIndex = Math.min(startIndex + pageSize - 1, this.incidentData.length);
  
    return `${endIndex} de ${this.incidentData.length} items`;
  }

  logout(): void {
    this.AuthService.logout();
    localStorage.removeItem('timerService.remainingTime');
  }
  
}
