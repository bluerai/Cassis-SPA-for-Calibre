# Cassis WebServer for Calibre
 Node-Webserver for Calibre E-Book Management based on Node, Express & PUG with server-side rendering


-- under Construction --




# Selbsterstelltes Zertifikat:
openssl genrsa -out server.key 2048

openssl req -new -x509 -key server.key -out server.cert -days 9999 -subj /CN=localhost
