{ lib, config, ... }:

let
  cfg = config.services.interactive-apex-map;
in
{
  options.services.interactive-apex-map = {
    enable = lib.mkEnableOption "Serve the Interactive Apex Map via nginx";

    package = lib.mkOption {
      type = lib.types.package;
      description = "Package that contains the static site (must include index.html).";
    };

    domain = lib.mkOption {
      type = lib.types.str;
      default = "localhost";
      description = "Hostname or domain for the virtual host.";
    };

    port = lib.mkOption {
      type = lib.types.int;
      default = 8080;
      description = "TCP port nginx should listen on.";
    };

    openFirewall = lib.mkEnableOption
      "Open the firewall for the interactive-apex-map port";
  };

  config = lib.mkIf cfg.enable {
    assertions = [{
      assertion = cfg.package != null;
      message = "services.interactive-apex-map.package must be set!";
    }];

    networking.firewall.allowedTCPPorts =
      lib.mkIf cfg.openFirewall [ cfg.port ];

    services.nginx = {
      enable = true;

      virtualHosts."${cfg.domain}" = {
        listen = [{ addr = "0.0.0.0"; port = cfg.port; }];
        root = cfg.package;
        extraConfig = "index  index.html;";
      };
    };
  };
}
