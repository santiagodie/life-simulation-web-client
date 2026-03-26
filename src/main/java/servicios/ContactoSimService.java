package servicios;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import com.tt1.trabajo.utilidades.ResultadosApi;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import interfaces.InterfazContactoSim;
import modelo.DatosSimulation;
import modelo.DatosSolicitud;
import modelo.Entidad;
import modelo.Punto;

@Service
public class ContactoSimService implements InterfazContactoSim {

	private final Map<Integer, DatosSolicitud> simulaciones;
	private final Random random;
	private final List<Entidad> entidades;
	private final RestTemplate restTemplate;
	private final ResultadosApi resultadosApi;
	@Value("${servicio.url}")
	private String servicioUrl;

	public ContactoSimService() {
		this.simulaciones = new HashMap<>();
		this.random = new Random();
		this.entidades = createEntities();
		this.restTemplate = new RestTemplate();
		this.resultadosApi = new ResultadosApi();
	}

	public ContactoSimService(RestTemplate restTemplate, ResultadosApi resultadosApi) {
		this.simulaciones = new HashMap<>();
		this.random = new Random();
		this.entidades = createEntities();
		this.restTemplate = restTemplate;
		this.resultadosApi = resultadosApi;
	}

	private List<Entidad> createEntities() {
		List<Entidad> list = new ArrayList<>();

		Entidad e1 = new Entidad();
		e1.setId(1);
		e1.setName("Servidores");
		e1.setDescripcion("Servidores concurrentes y eficientes");
		list.add(e1);

		Entidad e2 = new Entidad();
		e2.setId(2);
		e2.setName("Clientes");
		e2.setDescripcion("Personas que utilizan los servicios");
		list.add(e2);

		Entidad e3 = new Entidad();
		e3.setId(3);
		e3.setName("Bases de datos");
		e3.setDescripcion("Bases de datos relacionales y no relacionales");
		list.add(e3);
		return list;
	}
	@Override
	public int solicitarSimulation(DatosSolicitud sol) {
		List<String> nombres = new ArrayList<>();
		List<Integer> cantidades = new ArrayList<>();

		for (Map.Entry<Integer, Integer> entry : sol.getNums().entrySet()) {
			int id = entry.getKey();
			int cantidad = entry.getValue();
			entidades.stream()
				.filter(e -> e.getId() == id)
				.findFirst()
				.ifPresent(e -> {
					nombres.add(e.getName());
					cantidades.add(cantidad);
				});
		}

		Map<String, Object> innerSolicitud = new HashMap<>();
		innerSolicitud.put("cantidadesIniciales", cantidades);
		innerSolicitud.put("nombreEntidades", nombres);

		Map<String, Object> body = new HashMap<>();
		body.put("solicitud", innerSolicitud);

		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(MediaType.APPLICATION_JSON);

		HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
		ResponseEntity<Object> respuesta = restTemplate.postForEntity(servicioUrl + "/Solicitud/Solicitar?nombreUsuario=sadie27",
			request,
			Object.class
		);

		if (respuesta.getBody() == null) {
			return -1;
		}
		@SuppressWarnings("unchecked")
		Map<String, Object> responseBody = (Map<String, Object>) respuesta.getBody();
		return ((Number) responseBody.get("tokenSolicitud")).intValue();
	}
	@Override
	public DatosSimulation descargarDatos(int ticket) {
		Object respuesta = resultadosApi.resultadosPost("sadie27", ticket);
		if (respuesta == null) {
			return null;
		}

		@SuppressWarnings("unchecked")
		Map<String, Object> respuestaMap = (Map<String, Object>) respuesta;
		String[] lineas = respuestaMap.get("data").toString().split("\n");
		int anchoTablero = Integer.parseInt(lineas[0].trim());

		Map<Integer, List<Punto>> puntos = new HashMap<>();
		int maxTiempo = 0;

		for (int i = 1; i < lineas.length; i++) {
			String linea = lineas[i].trim();
			if (linea.isEmpty()) continue;
			String[] partes = linea.split(",");
			int tiempo = Integer.parseInt(partes[0].trim());
			int y = Integer.parseInt(partes[1].trim());
			int x = Integer.parseInt(partes[2].trim());
			String color = partes[3].trim();

			Punto p = new Punto();
			p.setY(y);
			p.setX(x);
			p.setColor(color);

			puntos.computeIfAbsent(tiempo, k -> new ArrayList<>()).add(p);
			if (tiempo > maxTiempo) maxTiempo = tiempo;
		}

		DatosSimulation ds = new DatosSimulation();
		ds.setAnchoTablero(anchoTablero);
		ds.setMaxSegundos(maxTiempo + 1);
		ds.setPuntos(puntos);
		return ds;
	}
	@Override
	public List<Entidad> getEntities() {
		return new ArrayList<>(entidades);
	}
	@Override
	public boolean isValidEntityId(int id) {
		return entidades.stream().anyMatch(e -> e.getId() == id);
	}
}
