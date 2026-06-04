package com.museo.museo_backend.controller;

import com.museo.museo_backend.dto.ObraDeterioradaRequest;
import com.museo.museo_backend.entity.ObraDeteriorada;
import com.museo.museo_backend.entity.enums.EstadoObra;
import com.museo.museo_backend.service.ObraDeterioradaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/obras-deterioradas")
@RequiredArgsConstructor
public class ObraDeterioradaController {

    private final ObraDeterioradaService service;

    @GetMapping
    public ResponseEntity<Page<ObraDeteriorada>> listarTodas(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.listarTodas(page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ObraDeteriorada> buscarPorId(@PathVariable Integer id) {
        return ResponseEntity.ok(service.buscarPorId(id));
    }

    @GetMapping("/filtrar")
    public ResponseEntity<Page<ObraDeteriorada>> filtrar(
            @RequestParam(required = false) EstadoObra estado,
            @RequestParam(required = false) String autor,
            @RequestParam(required = false) Integer idTecnica,
            @RequestParam(required = false) Integer idTipo,
            @RequestParam(required = false) Integer anio,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.filtrarAvanzado(estado, autor, idTecnica, idTipo, anio, page, size));
    }

    @GetMapping("/sin-restauracion-finalizada")
    public ResponseEntity<Page<ObraDeteriorada>> sinRestauracionFinalizada(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.listarSinRestauracionFinalizada(page, size));
    }

    @PostMapping
    public ResponseEntity<ObraDeteriorada> reportar(@Valid @RequestBody ObraDeterioradaRequest req) {
        return ResponseEntity.ok(service.reportar(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ObraDeteriorada> editar(@PathVariable Integer id,
            @Valid @RequestBody ObraDeterioradaRequest req) {
        return ResponseEntity.ok(service.editar(id, req));
    }
}