document.addEventListener("DOMContentLoaded", function () {
    const dbName = "RegistroQR";
    const dbVersion = 1;
    const mensajeUsuario = 'Registro correcto'
    let db;

  
    const url = new URL(window.location.href);
    const fileName = url.pathname.split('/').pop();
    
    const type = fileName.split('.')[0];

    console.log(type);
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
        if(type == "entrada"){
            Swal.fire({
                title: "Bienvenido(a)",
                text: "Bienvenido(a) {nombre}",
                icon: "success"
              });
        }
        // Ocultar el mensaje después de 3 segundos
        setTimeout(() => {
            messageDiv.classList.remove("visible");
            if(type=="entrada"){
                Swal.close();
            }
            
        }, 5000);
    
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
        const rut = datosQR.split(",");
        console.log(rut);
        if (!rut) {
            console.error("QR inválido");
            processingQR = false;
            return;
        }

        window.location.href = `bandeja.html?rut=${rut}`;
        return;
              
       
    }



    document.getElementById("exportarExcel").addEventListener("click", function () {
        let transaction = db.transaction(["Registros"], "readonly");
        let objectStore = transaction.objectStore("Registros");
        let registros = [["Operadora", "Clon", "Invernadero", "Canaleton","Movimiento", "Correlativo", "Fecha y hora"]];

        objectStore.openCursor().onsuccess = function (event) {
            let cursor = event.target.result;
            if (cursor) {
                registros.push([cursor.value.rut, cursor.value.clon, cursor.value.invernadero,
                    cursor.value.canaleton,cursor.value.movimiento,cursor.value.correlativo , cursor.value.timestamp]);
                cursor.continue();
            } else {
                let csvContent = "data:text/csv;charset=utf-8," + registros.map(e => e.join(",")).join("\n");
                let link = document.createElement("a");
                link.setAttribute("href", encodeURI(csvContent));
                let currentTime = Date.now();
                let readableDate = new Date(currentTime);
                let nombre_archivo = "Registro_entrada_" + readableDate.toISOString().split('T')[0]; + ".csv"
                link.setAttribute("download", nombre_archivo);
                document.body.appendChild(link);
                link.click();
            }
        };
    });


});
