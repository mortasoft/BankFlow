# Etapa 1: Construcción
FROM node:20-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# Nota: Aquí se deben inyectar las variables de entorno de construcción si es necesario
RUN npm run build

# Etapa 2: Producción con Nginx
FROM nginx:alpine

# Copiar los archivos construidos desde la etapa anterior
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuración personalizada de Nginx si existe, si no, usa la default
# EXPOSE 80 (Nginx corre en el 80 por defecto)

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
