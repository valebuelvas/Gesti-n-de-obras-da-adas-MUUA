package com.museo.museo_backend.service;

import com.museo.museo_backend.dto.ObraDeterioradaRequest;
import com.museo.museo_backend.entity.*;
import com.museo.museo_backend.entity.enums.EstadoObra;
import com.museo.museo_backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import java.util.List;

@Service @RequiredArgsConstructor
public class ObraDeterioradaService {

    private final ObraDeterioradaRepository repo;
    private final ObraRepository obraRepository;
    private final PersonalMuseoRepository personalRepo;

    public Page<ObraDeteriorada> listarTodas(int page, int size) {
        return repo.findAll(PageRequest.of(page, size, Sort.by("id").descending()));
    }

    public ObraDeteriorada buscarPorId(Integer id) {
        return repo.findById(id)
            .orElseThrow(() -> new RuntimeException("Obra deteriorada no encontrada con id: " + id));
    }

    private PersonalMuseo resolvePersonal(Integer id) {
        if (id == null) return null;
        return personalRepo.findById(id).orElseThrow(() -> new RuntimeException("Personal no encontrado"));
    }

    public ObraDeteriorada reportar(ObraDeterioradaRequest r) {
        Obra obra = obraRepository.findById(r.getIdObra())
            .orElseThrow(() -> new RuntimeException("Obra no encontrada"));
        return repo.save(ObraDeteriorada.builder()
            .obra(obra)
            .personal(resolvePersonal(r.getIdPersonal()))
            .descripcion(r.getDescripcion())
            .estado(r.getEstado())
            .fechaIdentificacion(r.getFechaIdentificacion())
            .build());
    }

    public ObraDeteriorada editar(Integer id, ObraDeterioradaRequest r) {
        ObraDeteriorada od = buscarPorId(id);
        Obra obra = obraRepository.findById(r.getIdObra())
            .orElseThrow(() -> new RuntimeException("Obra no encontrada"));
        od.setObra(obra);
        od.setPersonal(resolvePersonal(r.getIdPersonal()));
        od.setDescripcion(r.getDescripcion());
        od.setEstado(r.getEstado());
        od.setFechaIdentificacion(r.getFechaIdentificacion());
        return repo.save(od);
    }

    public Page<ObraDeteriorada> filtrarAvanzado(EstadoObra estado, String autor,
                                                  Integer idTecnica, Integer idTipo,
                                                  Integer anio, int page, int size) {
        String estadoStr = estado != null ? estado.name() : null;
        return repo.filtrarAvanzado(estadoStr, autor, idTecnica, idTipo, anio,
            PageRequest.of(page, size, Sort.by("id").descending()));
    }

    public Page<ObraDeteriorada> listarSinRestauracionFinalizada(int page, int size) {
        return repo.findSinRestauracionFinalizada(
            PageRequest.of(page, size, Sort.by("id").descending()));
    }
}