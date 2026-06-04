package com.museo.museo_backend.controller;
import com.museo.museo_backend.dto.PersonalMuseoRequest;
import com.museo.museo_backend.entity.PersonalMuseo;
import com.museo.museo_backend.service.PersonalMuseoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/api/personal") @RequiredArgsConstructor
public class PersonalMuseoController {
    private final PersonalMuseoService service;
    @GetMapping public ResponseEntity<List<PersonalMuseo>> listarTodos() { return ResponseEntity.ok(service.listarTodos()); }
    @GetMapping("/{id}") public ResponseEntity<PersonalMuseo> buscarPorId(@PathVariable Integer id) { return ResponseEntity.ok(service.buscarPorId(id)); }
    @PostMapping public ResponseEntity<PersonalMuseo> crear(@Valid @RequestBody PersonalMuseoRequest req) { return ResponseEntity.ok(service.crear(req)); }
   @PutMapping("/{id}")
public ResponseEntity<PersonalMuseo> editar(@PathVariable Integer id,
                                             @Valid @RequestBody PersonalMuseoRequest request) {
    return ResponseEntity.ok(service.editarConId(id, request));
}
}

