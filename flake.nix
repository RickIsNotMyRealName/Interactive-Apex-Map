{
  description = "Interactive Apex Legends map as a Nix flake";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        interactive-apex-map = pkgs.callPackage ./nix/package.nix { };
      in
      {
        packages = {
          interactive-apex-map = interactive-apex-map;
          default = interactive-apex-map;
        };
      }) // {
      nixosModules = {
        interactive-apex-map = import ./nix/module.nix;
        default = import ./nix/module.nix;
      };
    };
}
