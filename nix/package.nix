{ lib, pkgs, src ? ./.. }:

pkgs.stdenv.mkDerivation {
  pname = "interactive-apex-map";
  version = "2025-05-26";

  inherit src;
  dontBuild = true;

  installPhase = ''
    runHook preInstall
    cp -rT "$src" "$out"
    runHook postInstall
  '';

  meta = with lib; {
    description = "Interactive Apex Legends map (static site)";
    license = licenses.mit;
    platforms = platforms.all;
  };
}
