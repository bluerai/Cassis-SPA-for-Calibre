# Cassis - WebServer for Calibre
 Node-Webserver for Calibre E-Book Management based on Node, Express & PUG with server-side rendering

Cassis ist ein neu entwickelter Webserver zur Verteilung von Publikationen aus einer Calibre-Bibliothek. Mit Cassis werden Bücher, Zeitschriften oder andere Publikationen (Formate: PDF , Epub und viele andere) aus Calibre zum Lesen auf einen Client übertragen. Auf dem Client wird zunächst eine Single-Page-App vom Webserver heruntergeladen. Der Client kann ein Smartphone, Tablet, E-Reader, Desktop- oder Laptop-PC sein. Voraussetzung ist nur ein Browser und ggf. ein Lese-Programm.

Als Server sind einfache Ein-Platinen-Rechner (ab ca. Raspberry PI 3 oä.) vollkommen ausreichend.

Calibre⁠, das Programm zum E-Book-Mangement von KOVID GOYAL, stellt die Basisdaten für den Webserver zur Verfügung: ein Verzeichnis mit Publikationen und eine sqlite-Datenbank mit den Metadaten.

Cassis ist in Javascript geschrieben. Der Server läuft auf Basis von Node.js mit Express und PUG und rendert den HTML-Code. Die App ist noch in der Entwicklung, kann aber schon verwendet und getestet werden. Die Sprache der Oberfläche ist zurzeit ausschließlich Deutsch.

-- under Construction --




# Selbsterstelltes Zertifikat:
openssl genrsa -out server.key 2048

openssl req -new -x509 -key server.key -out server.crt -days 9999 -subj /CN=localhost
