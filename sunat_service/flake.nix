{
  description = "Entorno Nix para el servicio SUNAT de BioActiva";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };

        pythonEnv = pkgs.python312.withPackages (ps: with ps; [
          fastapi
          greenlet
          playwright
          uvicorn
        ]);

        sunatService = pkgs.writeShellApplication {
          name = "bioactiva-sunat-service";
          runtimeInputs = [ pythonEnv ];
          text = ''
            cd ${self}
            uvicorn main:app --host 127.0.0.1 --port 8000
          '';
        };
      in
      {
        formatter = pkgs.alejandra;

        devShells.default = pkgs.mkShell {
          packages = [
            pythonEnv
            pkgs.playwright-driver.browsers
          ];

          shellHook = ''
            export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
            export NODE_ENV=development
          '';
        };

        packages.default = sunatService;

        apps.default = {
          type = "app";
          program = "${sunatService}/bin/bioactiva-sunat-service";
        };
      }
    );
}