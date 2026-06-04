package com.museo.museo_backend.controller;

import com.museo.museo_backend.dto.ObraRequest;
import com.museo.museo_backend.entity.Obra;
import com.museo.museo_backend.service.ObraService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/obras")
@RequiredArgsConstructor
public class ObraController {

    private final ObraService service;

    @GetMapping
    public ResponseEntity<Page<Obra>> listarPaginado(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String titulo,
            @RequestParam(required = false) String autor) {
        return ResponseEntity.ok(service.buscarPaginado(titulo, autor, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Obra> buscarPorId(@PathVariable Integer id) {
        return ResponseEntity.ok(service.buscarPorId(id));
    }

    @GetMapping("/buscar")
    public ResponseEntity<Page<Obra>> busquedaAvanzada(
            @RequestParam(required = false) String autor,
            @RequestParam(required = false) String titulo,
            @RequestParam(required = false) Integer idTecnica,
            @RequestParam(required = false) Integer idTipo,
            @RequestParam(required = false) Integer anio,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.busquedaAvanzada(autor, titulo, idTecnica, idTipo, anio, page, size));
    }

    @PostMapping
    public ResponseEntity<Obra> crear(@Valid @RequestBody ObraRequest req) {
        return ResponseEntity.ok(service.crear(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Obra> editar(@PathVariable Integer id,
            @Valid @RequestBody ObraRequest req) {
        return ResponseEntity.ok(service.editar(id, req));
    }
}