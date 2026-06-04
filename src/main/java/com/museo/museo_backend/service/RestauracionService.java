package com.museo.museo_backend.service;

import com.museo.museo_backend.dto.RestauracionRequest;
import com.museo.museo_backend.entity.*;
import com.museo.museo_backend.entity.enums.EstadoRestauracion;
import com.museo.museo_backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;

@Service @RequiredArgsConstructor
public class RestauracionService {

    private final RestauracionRepository repo;
    private final ObraDeterioradaRepository odRepo;
    private final PersonalMuseoRepository personalRepo;
    private final ObraRepository obraRepo;

    public Page<Restauracion> listarTodas(int page, int size) {
        return repo.findAll(PageRequest.of(page, size, Sort.by("id").descending()));
    }

    public Restauracion buscarPorId(Integer id) {
        return repo.findById(id)
            .orElseThrow(() -> new RuntimeException("Restauracion no encontrada con id: " + id));
    }

    public Page<Restauracion> filtrarPorObraDeteriorada(Integer id, int page, int size) {
        return repo.findByObraDeterioradaIdPaginado(id,
            PageRequest.of(page, size, Sort.by("id").descending()));
    }

    public Page<Restauracion> filtrarPorRangoFecha(LocalDate desde, LocalDate hasta, int page, int size) {
        return repo.findByRangoFecha(desde, hasta,
            PageRequest.of(page, size, Sort.by("id").descending()));
    }

    public List<Restauracion> filtrarPorObra(Integer idObra) {
        return repo.findByObraId(idObra);
    }

    private PersonalMuseo resolvePersonal(Integer id) {
        if (id == null) return null;
        return personalRepo.findById(id).orElseThrow(() -> new RuntimeException("Personal no encontrado"));
    }

    public Restauracion crear(RestauracionRequest r) {
        ObraDeteriorada od = odRepo.findById(r.getIdObraDeteriorada())
            .orElseThrow(() -> new RuntimeException("Obra deteriorada no encontrada"));

        Restauracion saved = repo.save(Restauracion.builder()
            .fechaRestauracion(r.getFechaRestauracion())
            .estado(r.getEstado())
            .tipoRestauracion(r.getTipoRestauracion())
            .responsable(r.getResponsable())
            .personalMuseo(resolvePersonal(r.getIdPersonalMuseo()))
            .obraDeteriorada(od)
            .observaciones(r.getObservaciones())
            .build());

        if (r.getEstado() == EstadoRestauracion.finalizado) {
            Obra obra = od.getObra();
            if (obra.getFechaUltimaRevision() == null ||
                r.getFechaRestauracion().isAfter(obra.getFechaUltimaRevision())) {
                obra.setFechaUltimaRevision(r.getFechaRestauracion());
                obraRepo.save(obra);
            }
        }
        return saved;
    }

    public Restauracion editar(Integer id, RestauracionRequest r) {
        Restauracion res = buscarPorId(id);
        ObraDeteriorada od = odRepo.findById(r.getIdObraDeteriorada())
            .orElseThrow(() -> new RuntimeException("Obra deteriorada no encontrada"));

        res.setFechaRestauracion(r.getFechaRestauracion());
        res.setEstado(r.getEstado());
        res.setTipoRestauracion(r.getTipoRestauracion());
        res.setResponsable(r.getResponsable());
        res.setPersonalMuseo(resolvePersonal(r.getIdPersonalMuseo()));
        res.setObraDeteriorada(od);
        res.setObservaciones(r.getObservaciones());

        Restauracion saved = repo.save(res);

        if (r.getEstado() == EstadoRestauracion.finalizado) {
            Obra obra = od.getObra();
            if (obra.getFechaUltimaRevision() == null ||
                r.getFechaRestauracion().isAfter(obra.getFechaUltimaRevision())) {
                obra.setFechaUltimaRevision(r.getFechaRestauracion());
                obraRepo.save(obra);
            }
        }
        return saved;
    }
}