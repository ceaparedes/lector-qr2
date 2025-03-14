document.addEventListener("DOMContentLoaded", function () {
    const dbName = "RegistroQR";
    const dbVersion = 1;
    const mensajeUsuario = 'Registro correcto'
    let db;
    let contador_bandejas = 0;
    const timeOut = 2;

    const params = new URLSearchParams(window.location.search);
    // Obtener el valor del parámetro "rut"
    const rut = params.get("rut");

    console.log("RUT:", rut);

    const url = new URL(window.location.href);
    const fileName = url.pathname.split('/').pop();
    
    const type = fileName.split('.')[0];

    console.log(type);
        
    

    // 💾 Abrir o crear la base de datos
    const request = indexedDB.open(dbName, dbVersion);

    request.onupgradeneeded = function (event) {
        db = event.target.result;
        if (!db.objectStoreNames.contains("Registros")) {
            const objectStore = db.createObjectStore("Registros", { keyPath: "id", autoIncrement: true });
            objectStore.createIndex("rut", "rut", { unique: false });
            objectStore.createIndex("timestamp", "timestamp", { unique: false });
            objectStore.createIndex("clon", "clon", { unique: false });

        }
    };

    request.onsuccess = function (event) {
        db = event.target.result;
        console.log("IndexedDB inicializada correctamente.");
        //cargarRegistrosEnTabla(); // Cargar registros en la tabla al inicio
    };

    request.onerror = function (event) {
        console.error("Error al abrir la base de datos", event.target.error);
    };
    

  
    document.getElementById("reader").addEventListener("keypress", function (event) {
        if (event.key === "Enter") { // La mayoría de los lectores envían un "Enter" al final
          console.log("Código escaneado:", event.target.value);
          let readedData = event.target.value;
          readedData = readedData.replace('!', '');
          console.log("readedData:",readedData);
          readedData = rut+','+readedData;
          
          procesarQR(readedData);
          event.target.value = ""; // Limpiar el campo después de leer
          document.getElementById("qr-result").innerText = mensajeUsuario;  

        let messageDiv = document.getElementById("message");
            
            // Mostrar el mensaje con el check
            messageDiv.classList.add("visible");
            // Ocultar el mensaje después de 3 segundos
            setTimeout(() => {
                messageDiv.classList.remove("visible");
            }, 3000);
    
        }
      });
 

    // 📝 Procesar datos y guardarlos en IndexedDB
    let processingQR = false; // Bandera para evitar múltiples inserciones

    function procesarQR(datosQR) {
        console.log('Processing:', processingQR);
        
        navigator.mediaDevices.enumerateDevices().then(devices => {
            let videoDevices = devices.filter(device => device.kind === "videoinput");
            videoDevices.forEach(device => {
                console.log(`ID: ${device.deviceId} - Label: ${device.label}`);
            });
        });
        


        if (processingQR) return; // Si ya se está procesando, no hacer nada
        processingQR = true; // Bloquear nuevas inserciones
        const [rut, clon, invernadero,canaleton, correlativo] = datosQR.split(",");
        if (!rut || !clon || !invernadero || !canaleton || !correlativo) {
            console.error("QR inválido");
            processingQR = false;
            return;
        }

        
        // const movimiento = 'entrada';
        const movimiento = type; //determina si es entrada y salida
        const timestamp = obtenerFechaFormateada();
        const horaRegistroActual = obtenerFechaInt(timestamp);
        const transaction = db.transaction(["Registros"], "readonly");
        const objectStore = transaction.objectStore("Registros");
        const index = objectStore.index("rut");  // Puedes ajustar esto según tus índices
        const request = index.openCursor(IDBKeyRange.only(rut), "prev");  // Obtener todos los registros de la persona
        
        request.onsuccess = function (event) {
            const cursor = event.target.result;
            if (cursor) {
                const registro = cursor.value;
                const horaRegistro = obtenerFechaInt(registro.timestamp);
                console.log('hora registro:',horaRegistro);
                console.log('Hora registro nuevo:', horaRegistroActual);
                if (registro.rut === rut && registro.clon === clon && 
                    (horaRegistro == horaRegistroActual || horaRegistro + timeOut >= horaRegistroActual ) ) {
                    console.log(horaRegistro + timeOut , horaRegistroActual);
                    console.log("Registro duplicado encontrado, no se insertará.");
                    processingQR = false;
                }
                else {
                    console.log('ingrese al primer else');
                    insertarRegistro(rut, clon, invernadero, canaleton, correlativo,movimiento, timestamp);
                    
                }
                //cursor.continue();  // Continuar buscando más registros
            } else {
    
                console.log('ingrese al segundo else');
                // Si no hay registros, insertar el nuevo registro
                insertarRegistro(rut, clon, invernadero, canaleton, correlativo,movimiento, timestamp);
            }
        };
    
        request.onerror = function () {
            console.error("Error al consultar IndexedDB.");
            processingQR = false;
        };
    }

    // 💾 Guardar registro en la BD
    function insertarRegistro(rut, clon, invernadero, canaleton, correlativo,movimiento, timestamp) {
        const transaction = db.transaction("Registros", "readwrite");
        const objectStore = transaction.objectStore("Registros");
        console.log(rut, clon, invernadero, canaleton, correlativo,movimiento, timestamp);
        const nuevoRegistro = {
            rut: rut,
            clon: clon,
            invernadero : invernadero,
            canaleton : canaleton,
            movimiento: movimiento,
            correlativo:correlativo,
            timestamp: timestamp
        };
    
        const request = objectStore.add(nuevoRegistro);
    
        request.onsuccess = function(event) {
            
            console.log("Registro insertado con éxito.");
        };
    
        request.onerror = function(event) {
            console.error("Error al insertar el registro:", event.target.error);
        };
        
        let tbody = document.getElementById("nuevos-registros");
        contador_bandejas ++;
        let nuevoRegistroTable = `
                <tr>
                    <td>${contador_bandejas}</td>
                    <td>${rut}</td>
                    <td>${clon}</td>
                    <td>${canaleton}</td>
                    <td>${invernadero}</td>
                    <td>${correlativo}</td>
                    <td>${timestamp}</td>
                </tr>
        `;
        tbody.insertAdjacentHTML('afterbegin', nuevoRegistroTable);


        processingQR = false;
        
    }

    // 📅 Formatear fecha a dd/mm/yyyy hh:mm
    function obtenerFechaFormateada() {
        const ahora = new Date();  // Obtiene la fecha actual
        const dia = String(ahora.getDate()).padStart(2, '0');  // Día con 2 dígitos
        const mes = String(ahora.getMonth() + 1).padStart(2, '0');  // Mes (ten en cuenta que getMonth() empieza desde 0)
        const anio = ahora.getFullYear();  // Año
        const horas = String(ahora.getHours()).padStart(2, '0');  // Horas
        const minutos = String(ahora.getMinutes()).padStart(2, '0');  // Minutos
        const segundos = String(ahora.getSeconds()).padStart(2, '0');  // Segundos

        return `${dia}/${mes}/${anio} ${horas}:${minutos}:${segundos}`;  // Formato dd/mm/yyyy hh:mm
    }


    function obtenerFechaInt(formatoFecha) {
        // Asumiendo que el formatoFecha es algo como "dd/mm/yyyy hh:mmss"
        const partes = formatoFecha.split(' ');
        const fecha = partes[0].split('/'); // dd/mm/yyyy
        const hora = partes[1].replaceAll(':', ''); // hhmmss

        // Concatenar año, mes, día, hora y minutos en un solo número
        const fechaHoraNumero = parseInt(fecha[2] + fecha[1] + fecha[0] + hora);
        
        return parseInt(fechaHoraNumero);  // Devuelve la fecha y hora en formato int
    }



});
