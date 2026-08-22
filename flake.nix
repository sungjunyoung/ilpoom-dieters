{
  description = "ilpoom-dieters — 일품 다이어트 추적기 dev environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_24
            pnpm
            sqlite
          ];

          shellHook = ''
            echo "ilpoom-dieters dev shell — node $(node --version), pnpm $(pnpm --version)"
          '';
        };
      });
}
