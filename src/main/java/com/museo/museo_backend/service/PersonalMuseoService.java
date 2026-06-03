package com.museo.museo_backend.service;

import com.museo.museo_backend.dto.PersonalMuseoRequest;
import com.museo.museo_backend.entity.PersonalMuseo;
import com.museo.museo_backend.entity.enums.Rol;
import com.museo.museo_backend.repository.PersonalMuseoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PersonalMuseoService {

    private final PersonalMuseoRepository repo;
    private final PasswordEncoder passwordEncoder;

    public List<PersonalMuseo> listarTodos() {
        return repo.findAll();
    }

    public PersonalMuseo buscarPorId(Integer id) {
        return repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Personal no encontrado con id: " + id));
    }

    public PersonalMuseo crear(PersonalMuseoRequest r) {
        // Validar que las contraseñas coincidan
        if (r.getPassword() == null || r.getPassword().isBlank()) {
            throw new IllegalArgumentException("La contraseña es obligatoria al crear un usuario");
        }
        if (!r.getPassword().equals(r.getConfirmarPassword())) {
            throw new IllegalArgumentException("Las contraseñas no coinciden");
        }

        // Rol por defecto: colaborador
        Rol rol = r.getRol() != null ? r.getRol() : Rol.colaborador;

        return repo.save(PersonalMuseo.builder()
                .id(r.getId())
                .nombre(r.getNombre())
                .apellido(r.getApellido())
                .email(r.getEmail())
                .celular(r.getCelular())
                .password(passwordEncoder.encode(r.getPassword()))
                .rol(rol)
                .build());
    }

    public PersonalMuseo editarConId(Integer idActual, PersonalMuseoRequest r) {
        PersonalMuseo p = buscarPorId(idActual);

        // No permitir cambio de cédula
        if (!idActual.equals(r.getId())) {
            throw new IllegalStateException(
                "No se puede cambiar la cédula. Elimine el registro y créelo con la cédula correcta."
            );
        }

        p.setNombre(r.getNombre());
        p.setApellido(r.getApellido());
        p.setEmail(r.getEmail());
        p.setCelular(r.getCelular());

        // Solo actualizar contraseña si viene una nueva
        if (r.getPassword() != null && !r.getPassword().isBlank()) {
            if (!r.getPassword().equals(r.getConfirmarPassword())) {
                throw new IllegalArgumentException("Las contraseñas no coinciden");
            }
            p.setPassword(passwordEncoder.encode(r.getPassword()));
        }

        // Solo actualizar rol si viene uno
        if (r.getRol() != null) {
            p.setRol(r.getRol());
        }

        return repo.save(p);
    }
}