package com.tt1.trabajo;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import com.tt1.trabajo.utilidades.ResultadosApi;

import modelo.DatosSimulation;
import modelo.DatosSolicitud;
import modelo.Entidad;
import servicios.ContactoSimService;

class ContactoSimServiceTest {

	private ContactoSimService service;
	private RestTemplate mockRestTemplate;
	private ResultadosApi mockResultadosApi;

	@BeforeEach
	void setUp() {
		mockRestTemplate = mock(RestTemplate.class);
		mockResultadosApi = mock(ResultadosApi.class);
		service = new ContactoSimService(mockRestTemplate, mockResultadosApi);
	}

	@Test
	void testSolicitarSimulation() {
		Map<String, Object> fakeBody = new HashMap<>();
		fakeBody.put("tokenSolicitud", 12345);
		when(mockRestTemplate.postForEntity(anyString(), any(), eq(Object.class)))
			.thenReturn(new ResponseEntity<>(fakeBody, HttpStatus.CREATED));

		Map<Integer, Integer> nums = new HashMap<>();
		nums.put(1, 10);
		nums.put(2, 20);
		assertTrue(service.solicitarSimulation(new DatosSolicitud(nums)) > 0);
	}

	@Test
	void testSolicitarSimulationReturnsDifferentTokens() {
		Map<String, Object> body1 = new HashMap<>();
		body1.put("tokenSolicitud", 111);
		Map<String, Object> body2 = new HashMap<>();
		body2.put("tokenSolicitud", 222);
		when(mockRestTemplate.postForEntity(anyString(), any(), eq(Object.class)))
			.thenReturn(new ResponseEntity<>(body1, HttpStatus.CREATED))
			.thenReturn(new ResponseEntity<>(body2, HttpStatus.CREATED));

		Map<Integer, Integer> nums = new HashMap<>();
		nums.put(1, 10);
		int token1 = service.solicitarSimulation(new DatosSolicitud(nums));
		int token2 = service.solicitarSimulation(new DatosSolicitud(nums));
		assertNotEquals(token1, token2);
	}

	@Test
	void testDescargarDatos() {
		Map<String, Object> solBody = new HashMap<>();
		solBody.put("tokenSolicitud", 42);
		when(mockRestTemplate.postForEntity(anyString(), any(), eq(Object.class)))
			.thenReturn(new ResponseEntity<>(solBody, HttpStatus.CREATED));

		Map<String, Object> datosBody = new HashMap<>();
		datosBody.put("data", "5\n0,1,2,red");
		when(mockResultadosApi.resultadosPost("sadie27", 42)).thenReturn(datosBody);

		Map<Integer, Integer> nums = new HashMap<>();
		nums.put(1, 10);
		int ticket = service.solicitarSimulation(new DatosSolicitud(nums));
		assertNotNull(service.descargarDatos(ticket));
	}

	@Test
	void testDescargarDatosWithInvalidTicket() {
		when(mockResultadosApi.resultadosPost("sadie27", 99999)).thenReturn(null);
		assertNull(service.descargarDatos(99999));
	}

	@Test
	void testGetEntities() {
		List<Entidad> entidades = service.getEntities();
		assertNotNull(entidades);
		assertFalse(entidades.isEmpty());
		assertEquals(3, entidades.size());
	}

	@Test
	void testGetEntitiesHaveValidData() {
		List<Entidad> entidades = service.getEntities();
		for (Entidad e : entidades) {
			assertTrue(e.getId() > 0);
			assertNotNull(e.getName());
			assertNotNull(e.getDescripcion());
		}
	}

	@Test
	void testIsValidEntityIdReturnsTrueForValidIds() {
		assertTrue(service.isValidEntityId(1));
		assertTrue(service.isValidEntityId(2));
		assertTrue(service.isValidEntityId(3));
	}

	@Test
	void testIsValidEntityIdReturnsFalseForInvalidIds() {
		assertFalse(service.isValidEntityId(99));
		assertFalse(service.isValidEntityId(-1));
		assertFalse(service.isValidEntityId(0));
	}
}
