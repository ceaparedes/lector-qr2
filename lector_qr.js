document.addEventListener("DOMContentLoaded", function () {
    const dbName = "RegistroQR";
    const dbVersion = 1;
    const mensajeUsuario = 'Registro correcto'
    let db;

    // 💾 Abrir o crear la base de datos
    const request = indexedDB.open(dbName, dbVersion);

    function playBeep() {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = context.createOscillator();
        oscillator.type = "sine"; // Tipo de onda (senoidal para un "bip" limpio)
        oscillator.frequency.setValueAtTime(500, context.currentTime); // Frecuencia en Hz (1000 es un buen "bip")
        oscillator.connect(context.destination);
        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
        }, 500); // Duración del sonido en milisegundos
    }

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

    // 📷 Configurar lector QR
    function onScanSuccess(decodedText) {
        console.log(`Código QR detectado: ${decodedText}`);
        document.getElementById("qr-result").innerText = mensajeUsuario;

        procesarQR(decodedText); // Procesar los datos escaneados

        let messageDiv = document.getElementById("message");
            
        // Mostrar el mensaje con el check
        messageDiv.classList.add("visible");
        playBeep();
        // Ocultar el mensaje después de 3 segundos
        setTimeout(() => {
            messageDiv.classList.remove("visible");
        }, 3000);
    
    }

    function onScanError(errorMessage) {
        console.warn(`Error al leer QR: ${errorMessage}`);
    }

    let qrScanner = new Html5Qrcode("qr-reader");
    qrScanner.start(
        { facingMode: "user" }, // Usa cámara trasera
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        onScanError
    );

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
        const [rut, clon, invernadero,canaleton] = datosQR.split(",");
        if (!rut || !clon || !invernadero || !canaleton) {
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
                    (horaRegistro == horaRegistroActual || horaRegistro + 5 >= horaRegistroActual ) ) {
                    console.log(horaRegistro + 5 , horaRegistroActual);
                    console.log("Registro duplicado encontrado, no se insertará.");
                    processingQR = false;
                }
                else {
                    console.log('ingrese al primer else');
                    insertarRegistro(rut, clon, invernadero, canaleton,movimiento, timestamp);
                    
                }
                //cursor.continue();  // Continuar buscando más registros
            } else {
    
                console.log('ingrese al segundo else');
                // Si no hay registros, insertar el nuevo registro
                insertarRegistro(rut, clon, invernadero, canaleton,movimiento, timestamp);
            }
        };
    
        request.onerror = function () {
            console.error("Error al consultar IndexedDB.");
            processingQR = false;
        };
    }

    // 💾 Guardar registro en la BD
    function insertarRegistro(rut, clon, invernadero, canaleton,movimiento, timestamp) {
        const transaction = db.transaction("Registros", "readwrite");
        const objectStore = transaction.objectStore("Registros");
    
        const nuevoRegistro = {
            rut: rut,
            clon: clon,
            invernadero : invernadero,
            canaleton : canaleton,
            movimiento: movimiento,
            timestamp: timestamp
        };
    
        const request = objectStore.add(nuevoRegistro);
    
        request.onsuccess = function(event) {
            
            console.log("Registro insertado con éxito.");
        };
    
        request.onerror = function(event) {
            console.error("Error al insertar el registro:", event.target.error);
        };
        
        processingQR = false;
        //cargarRegistrosEnTabla();
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


    // 📤 Exportar datos a Excel
    document.getElementById("exportarExcel").addEventListener("click", function () {
        let transaction = db.transaction(["Registros"], "readonly");
        let objectStore = transaction.objectStore("Registros");
        let registros = [["Operadora", "Clon", "Invernadero", "Canaleton","Movimiento", "Fecha y hora"]];

        objectStore.openCursor().onsuccess = function (event) {
            let cursor = event.target.result;
            if (cursor) {
                registros.push([cursor.value.rut, cursor.value.clon, cursor.value.invernadero,
                    cursor.value.canaleton,cursor.value.movimiento, cursor.value.timestamp]);
                cursor.continue();
            } else {
                let csvContent = "data:text/csv;charset=utf-8," + registros.map(e => e.join(",")).join("\n");
                let link = document.createElement("a");
                link.setAttribute("href", encodeURI(csvContent));
                let currentTime = Date.now();
                let readableDate = new Date(currentTime);
                let nombre_archivo = "Registros_" + readableDate.toISOString().split('T')[0]; + ".csv"
                link.setAttribute("download", nombre_archivo);
                document.body.appendChild(link);
                link.click();
            }
        };
    });

});
