package com.museo.museo_backend.service;

import com.museo.museo_backend.dto.ObraRequest;
import com.museo.museo_backend.entity.*;
import com.museo.museo_backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import java.util.List;

@Service @RequiredArgsConstructor
public class ObraService {

    private final ObraRepository obraRepository;
    private final TecnicaRepository tecnicaRepository;
    private final TipoObraRepository tipoObraRepository;

    public List<Obra> listarTodas() { return obraRepository.findAll(); }

    public Obra buscarPorId(Integer id) {
        return obraRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Obra no encontrada con id: " + id));
    }

    public Obra crear(ObraRequest r) {
        Tecnica tecnica = tecnicaRepository.findById(r.getIdTecnica())
            .orElseThrow(() -> new RuntimeException("Tecnica no encontrada"));
        TipoObra tipo = tipoObraRepository.findById(r.getIdTipo())
            .orElseThrow(() -> new RuntimeException("Tipo de obra no encontrado"));
        return obraRepository.save(Obra.builder()
            .id(r.getId())
            .titulo(r.getTitulo()).autor(r.getAutor())
            .fechaCreacion(r.getFechaCreacion()).tipo(tipo)
            .fechaUltimaRevision(r.getFechaUltimaRevision())
            .ubicacion(r.getUbicacion()).linkDrive(r.getLinkDrive()).tecnica(tecnica)
            .dimensiones(r.getDimensiones()).integridad(r.getIntegridad())
            .asociacionHistorica(r.getAsociacionHistorica())
            .lugarEjecucion(r.getLugarEjecucion())
            .restricciones(r.getRestricciones()).anotaciones(r.getAnotaciones())
            .build());
    }

    public Obra editar(Integer id, ObraRequest r) {
        Obra obra = buscarPorId(id);
        Tecnica tecnica = tecnicaRepository.findById(r.getIdTecnica())
            .orElseThrow(() -> new RuntimeException("Tecnica no encontrada"));
        TipoObra tipo = tipoObraRepository.findById(r.getIdTipo())
            .orElseThrow(() -> new RuntimeException("Tipo no encontrado"));
        obra.setTitulo(r.getTitulo()); obra.setAutor(r.getAutor());
        obra.setFechaCreacion(r.getFechaCreacion()); obra.setTipo(tipo);
        obra.setFechaUltimaRevision(r.getFechaUltimaRevision());
        obra.setUbicacion(r.getUbicacion()); obra.setLinkDrive(r.getLinkDrive());
        obra.setTecnica(tecnica); obra.setDimensiones(r.getDimensiones());
        obra.setIntegridad(r.getIntegridad());
        obra.setAsociacionHistorica(r.getAsociacionHistorica());
        obra.setLugarEjecucion(r.getLugarEjecucion());
        obra.setRestricciones(r.getRestricciones()); obra.setAnotaciones(r.getAnotaciones());
        return obraRepository.save(obra);
    }

    public Page<Obra> busquedaAvanzada(String autor, String titulo, Integer idTecnica,
                                        Integer idTipo, Integer anio, int page, int size) {
        return obraRepository.busquedaAvanzada(autor, titulo, idTecnica, idTipo, anio,
            PageRequest.of(page, size, Sort.by("id").ascending()));
    }

    public Page<Obra> listarPaginado(int page, int size) {
        return obraRepository.findAll(PageRequest.of(page, size, Sort.by("id").ascending()));
    }

    public Page<Obra> buscarPaginado(String titulo, String autor, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").ascending());
        boolean hayTitulo = titulo != null && !titulo.isEmpty();
        boolean hayAutor  = autor  != null && !autor.isEmpty();
        if (!hayTitulo && !hayAutor)
            return obraRepository.findAll(pageable);
        else if (hayTitulo && !hayAutor)
            return obraRepository.findByTituloContainingIgnoreCase(titulo, pageable);
        else if (!hayTitulo && hayAutor)
            return obraRepository.findByAutorContainingIgnoreCase(autor, pageable);
        else
            return obraRepository.findByTituloContainingIgnoreCaseOrAutorContainingIgnoreCase(titulo, autor, pageable);
    }
}