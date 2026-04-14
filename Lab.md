# Laboratorio: Orquestación de Bases de Datos y Aplicaciones Tier-3 con Docker Swarm en AWS

## 1. Contexto Académico
**Maestría en Bases de Datos**  
**Materia:** Infraestructura y Seguridad en Bases de Datos  
**Caso de Estudio:** Sistema Bancario BankFlow (FastAPI + SQL Server + Redis + React)

## 2. Objetivos del Laboratorio
1.  **Aprender** a aprovisionar infraestructura en la nube (AWS) para clústeres distribuidores.
2.  **Configurar** un clúster de Docker Swarm con nodos de gestión y de trabajo.
3.  **Implementar** persistencia de datos en entornos orquestados para SQL Server.
4.  **Desplegar** una arquitectura de microservicios utilizando `docker stack`.
5.  **Visualizar** la alta disponibilidad y escalabilidad horizontal de los servicios.

## 3. Dinámica de Trabajo en Equipo (Grupos de 3)

Este laboratorio está diseñado para ser realizado en equipos de 3 personas, donde cada integrante es responsable de su propio nodo de infraestructura:

| Estudiante | Rol Sugerido | Responsabilidad Técnica |
| :--- | :--- | :--- |
| **Estudiante A** | Manager Node | Inicializar el Swarm (`init`), desplegar el Stack y gestionar el orquestador. |
| **Estudiante B** | Worker Node 1 | Unir su instancia al clúster y validar la ejecución de réplicas. |
| **Estudiante C** | Worker Node 2 | Unir su instancia al clúster y probar el balanceo de carga (Ingress Mesh). |

### 3.1. Consideración de Red para Trabajo Distribuidos
Si cada estudiante usa su propia cuenta de AWS o VPC independiente:
*   **IPs Públicas:** Al inicializar el Swarm, el Estudiante A debe usar su IP Pública:  
    `docker swarm init --advertise-addr <IP_PUBLICA_A>`
*   **Security Groups:** Cada estudiante debe abrir los puertos de Swarm (2377, 7946, 4789) permitiendo el tráfico desde las IPs Públicas de sus otros dos compañeros.
*   **Conectividad:** Los integrantes deben ser capaces de hacerse `ping` entre sus instancias antes de intentar el `join`.

---

## 4. Prerrequisitos
*   Cuenta activa en **AWS** (Capa gratuita es suficiente).
*   Instancia de terminal local (PowerShell, Bash o WSL).
*   Conocimientos básicos de Docker y redes.
*   Repositorio de la aplicación cargado en Docker Hub (opcional, se proveerán etiquetas).

---

## 5. Fase 1: Aprovisionamiento de Infraestructura
Deberá crear 3 instancias EC2 en AWS (Free Tier: `t2.micro` o `t3.micro`).

### 5.1. Configuración de Instancias
*   **Imagen (AMI):** Ubuntu 22.04 LTS o Amazon Linux 2023.
*   **Nombres sugeridos:** `swarm-manager`, `swarm-worker-1`, `swarm-worker-2`.
*   **Key Pair:** Crear o seleccionar una llave `.pem` para acceso SSH.

### 5.2. Grupo de Seguridad (Security Group)
Es CRÍTICO abrir los siguientes puertos para que Swarm funcione correctamente:

| Tipo | Puerto / Rango | Propósito |
| :--- | :--- | :--- |
| **TCP** | 22 | Acceso SSH |
| **TCP** | 2377 | Cluster Management (Manager) |
| **TCP/UDP** | 7946 | Node Communication (Gossip) |
| **UDP** | 4789 | Overlay Network (VXLAN) |
| **TCP** | 8013 | Acceso API (Backend) |
| **TCP** | 3000 | Acceso Web (Frontend) |
| **TCP** | 1433 | SQL Server (Opcional, acceso externo) |

---

## 6. Fase 2: Configuración del Clúster Swarm

1.  **Instalar Docker** en los 3 nodos:
    ```bash
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    ```

2.  **Inicializar el Manager** (En el nodo del **Estudiante A**):
    ```bash
    # Si están en redes diferentes (distintas cuentas de AWS), DEBE ser la IP Pública
    sudo docker swarm init --advertise-addr <IP_PUBLICA_STUDENT_A>
    ```
    *Copie el comando `docker swarm join --token ...` que aparece en la salida.*

3.  **Unir los Workers** (En los nodos de los **Estudiantes B y C**):
    *Pegue el comando copiado anteriormente. Asegúrese de que el puerto 2377 esté abierto en el Security Group del Estudiante A para que ellos puedan conectarse.*

4.  **Verificar el estado** (En `swarm-manager`):
    ```bash
    sudo docker node ls
    ```

---

## 7. Fase 3: Preparación del Stack de Despliegue

En el nodo **Manager**, cree un archivo llamado `docker-stack.yml`. A diferencia de Docker Compose, utilizaremos la llave `deploy` para el comportamiento en Swarm. No utilizaremos el comando `build` ya que Swarm requiere imágenes pre-construidas en un registro.

```yaml
version: '3.8'

services:
  db:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      - ACCEPT_EULA=Y
      - MSSQL_SA_PASSWORD=SecurePassword123!
    volumes:
      - sqlserver_data:/var/opt/mssql
    deploy:
      placement:
        constraints:
          - node.role == manager # Forzamos la DB al manager para persistencia local
      restart_policy:
        condition: on-failure

  redis:
    image: redis:alpine
    deploy:
      replicas: 1
      restart_policy:
        condition: any

  backend:
    image: <tu-usuario>/bankflow-backend:latest
    environment:
      - DB_HOST=db
      - DB_NAME=BankFlowDB
      - DB_USER=sa
      - DB_PASSWORD=SecurePassword123!
      - REDIS_HOST=redis
    deploy:
      replicas: 3
      update_config:
        parallelism: 2
        delay: 10s
      restart_policy:
        condition: on-failure

  frontend:
    image: <tu-usuario>/bankflow-frontend:latest
    ports:
      - "3000:80" # Mapeamos puerto 80 de Nginx al 3000 de la instancia
    environment:
      - API_BASE=http://<IP_PUBLICA_MANAGER>:8013/api
    deploy:
      replicas: 2
      restart_policy:
        condition: any

volumes:
  sqlserver_data:
```

> [!IMPORTANT]  
> **Solución al error 504 (Outdated Optimized Dep):**  
> Este error ocurre porque el servidor de desarrollo de Vite (`npm run dev`) no es apto para entornos de nube/Swarm. Intenta servir archivos individualmente y se corrompe al haber latencia o reinicios de contenedores.  
> **La solución correcta es usar un Build de Producción** servido por Nginx. Asegúrese de que su `frontend/Dockerfile` sea multi-etapa (etapa de `build` y etapa de `nginx`).

---

## 8. Fase 4: Despliegue y Escalado

1.  **Desplegar el Stack:**
    ```bash
    sudo docker stack deploy -c docker-stack.yml bankflow
    ```

2.  **Verificar servicios:**
    ```bash
    sudo docker stack services bankflow
    ```

3.  **Verificar tareas (donde corre cada contenedor):**
    ```bash
    sudo docker stack ps bankflow
    ```

4.  **Escalado en caliente:**
    Supongamos que el tráfico bancario aumenta. Escale el backend a 6 réplicas:
    ```bash
    sudo docker service scale bankflow_backend=6
    ```

---

## 9. Guía de Evaluación Detallada (Laboratorio Práctico)

Esta sección define las pruebas críticas que el estudiante debe ejecutar y documentar para validar el éxito de su infraestructura.

### 9.1. Validación del Clúster (Consistencia del Control Plane)
*   **Prueba:** Ejecutar `docker node ls` y `docker info`.
*   **Expectativa:** Se deben listar 3 nodos. Uno debe tener el `ROLE` de `Leader` (Manager) y los otros dos estar en estado `Ready`.
*   **Pregunta de reflexión:** ¿Qué sucede con el clúster si el nodo Manager entra en estado `Down`? Busque el concepto de "Quórum en Raft".

### 9.2. Prueba de Alta Disponibilidad (Self-Healing)
*   **Prueba:** Identifique un nodo Worker que esté ejecutando réplicas del `backend`. Apague esa instancia EC2 desde la consola de AWS o detenga el servicio de Docker en ella (`sudo systemctl stop docker`).
*   **Validación:** Ejecute `docker stack ps bankflow` repetidamente desde el Manager.
*   **Expectativa:** Deberá observar cómo Swarm detecta la pérdida del nodo y re-asigna las réplicas perdidas a los nodos que siguen activos para mantener el estado deseado (3 réplicas).

### 9.3. Persistencia de Datos y Afinidad (Database Constraints)
*   **Prueba:** Detenga el contenedor de la base de datos manualmente (`docker rm -f <container_id>`) en el Manager.
*   **Validación:** Verifique que Swarm levante un nuevo contenedor de la DB. Conéctese a la aplicación y verifique que los registros previos sigan ahí.
*   **Análisis Técnico:** Explique por qué el uso de `node.role == manager` en el `docker-stack.yml` es una solución "Quick-fix" y qué riesgos conlleva para la escalabilidad del clúster.

### 9.4. Conectividad Interna y Service Discovery
*   **Prueba:** Acceda a la consola de uno de los contenedores del `frontend`:
    ```bash
    sudo docker exec -it <id_contenedor_frontend> sh
    ```
*   **Validación:** Ejecute un `ping backend` o `curl http://backend:8013`.
*   **Concepto:** El estudiante debe explicar cómo funciona el DNS interno de Docker Swarm y la red Virtual IP (VIP).

### 9.5. Prueba de Balanceo de Carga (Ingress Mesh)
*   **Prueba:** Acceda a la aplicación utilizando la **IP Pública de un nodo Worker** en el puerto 3000, incluso si ese nodo no tiene una réplica del frontend ejecutándose en ese momento.
*   **Expectativa:** La aplicación debe cargar correctamente.
*   **Pregunta:** ¿Cuál es la diferencia entre el balanceo de carga en la capa de transporte (L4) de Swarm y un Application Load Balancer (ALB) de AWS?

---

## 10. Requerimientos de Entrega (Informe Técnico)

El estudiante deberá entregar un informe en formato PDF que incluya:

1.  **Arquitectura del Sistema:** Diagrama de red que incluya las instancias EC2, los Security Groups y la comunicación entre los servicios del Stack.
2.  **Bitácora de Despliegue:** Capturas de pantalla de los comandos `docker stack deploy` y `docker service ls`.
3.  **Resultados de Pruebas de Fallo:** Evidencia fotográfica del experimento 9.2 (Self-healing).
4.  **Análisis Crítico (Mínimo 500 palabras):**
    *   Compare Docker Swarm vs. Kubernetes para este caso de uso específico.
    *   Proponga una solución para mover la base de datos a un esquema de "Shared Storage" en AWS (ej. EFS o Amazon FSx) para eliminar la restricción de `placement.constraints`.
5.  **Conclusiones:** Lecciones aprendidas sobre la orquestación de bases de datos relacionales en contenedores.
