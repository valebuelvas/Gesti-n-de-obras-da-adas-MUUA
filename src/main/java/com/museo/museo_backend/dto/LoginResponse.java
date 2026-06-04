package com.museo.museo_backend.dto;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoginResponse {
    private String token;
    private String nombre;
    private String apellido;
    private String rol;
}
