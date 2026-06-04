package com.museo.museo_backend.dto;

import com.museo.museo_backend.entity.enums.Rol;
import jakarta.validation.constraints.*;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PersonalMuseoRequest {

    @NotNull(message = "La cédula es obligatoria")
    private Integer id;

    @NotBlank(message = "El nombre es obligatorio")
    private String nombre;

    @NotBlank(message = "El apellido es obligatorio")
    private String apellido;

    @NotBlank
    @Email(message = "Email inválido")
    private String email;

    @NotBlank(message = "El celular es obligatorio")
    private String celular;

    // Solo obligatorio al crear — al editar puede venir null para no cambiar
    private String password;

    private String confirmarPassword;

    private Rol rol; // si viene null se asigna colaborador por defecto
}