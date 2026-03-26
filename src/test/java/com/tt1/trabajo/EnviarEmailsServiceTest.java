package com.tt1.trabajo;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;

import modelo.Destinatario;
import servicios.EnviarEmailsService;

class EnviarEmailsServiceTest {

	private EnviarEmailsService service;
	private Logger mockLogger;

	@BeforeEach
	void setUp() {
		mockLogger = mock(Logger.class);
		service = new EnviarEmailsService(mockLogger);
	}

	@Test
	void testEnviarEmailReturnsTrue() {
		Destinatario destinatario = new Destinatario();
		String email = "Test email content";
		boolean result = service.enviarEmail(destinatario, email);
		assertTrue(result);
	}

	@Test
	void testEnviarEmailLogsMessage() {
		Destinatario destinatario = new Destinatario();
		String email = "Test email content";
		service.enviarEmail(destinatario, email);
		verify(mockLogger).info(anyString(), eq(destinatario), eq(email));
	}
}
