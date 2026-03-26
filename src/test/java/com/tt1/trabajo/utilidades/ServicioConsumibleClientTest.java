package com.tt1.trabajo.utilidades;

import com.tt1.trabajo.utilidades.ApiClient;
import com.tt1.trabajo.utilidades.SolicitudApi;
import com.tt1.trabajo.utilidades.modelo.Solicitud;

import org.junit.jupiter.api.Test;
import org.springframework.http.*;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ServicioConsumibleClientTest {

    @Test
    void testSolicitarYGetSolicitudes() {
        ApiClient apiClient = new ApiClient();
        apiClient.setBasePath("http://localhost:8080");

        SolicitudApi solicitudApi = new SolicitudApi(apiClient);

        // 1. POST /Solicitud/Solicitar con RestTemplate y Map como body
        try {
            RestTemplate restTemplate = new RestTemplate();

            Map<String, Object> body = new HashMap<>();
            body.put("solicitud", new Solicitud()
                .cantidadesIniciales(List.of(5, 3))
                .nombreEntidades(List.of("entidad1", "entidad2")));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            ResponseEntity<Object> response = restTemplate.postForEntity(
                "http://localhost:8080/Solicitud/Solicitar?nombreUsuario=sadie",
                request,
                Object.class
            );

            System.out.println("Respuesta Solicitar: " + response.getBody());
        } catch (Exception e) {
            System.out.println("Error en Solicitar: " + e.getMessage());
        }

        // 2. GET /Solicitud/GetSolicitudesUsuario
        try {
            List<Integer> resultado = solicitudApi.solicitudGetSolicitudesUsuarioGet("sadie");
            System.out.println("Solicitudes de sadie: " + resultado);
        } catch (Exception e) {
            System.out.println("Error en GetSolicitudesUsuario: " + e.getMessage());
        }
    }
}
