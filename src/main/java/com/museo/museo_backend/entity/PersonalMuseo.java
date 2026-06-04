package com.museo.museo_backend.entity;

import com.museo.museo_backend.entity.enums.Rol;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "personal_museo")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PersonalMuseo {

    @Id
    private Integer id; // cédula, manual

    @Column(name = "nombre", nullable = false, length = 100)
    private String nombre;

    @Column(name = "apellido", nullable = false)
    private String apellido;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "celular", nullable = false)
    private String celular;

    @Column(name = "password", nullable = false)
    private String password; // hash BCrypt

    @Enumerated(EnumType.STRING)
    @Column(name = "rol", nullable = false)
    private Rol rol; // colaborador, administrador, no_perteneciente
}