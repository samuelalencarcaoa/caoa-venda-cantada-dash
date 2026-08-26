# Configurações de Máquina e Softwares Necessários

## Configuração mínima de máquina

- CPU: 2 núcleos
- RAM: 4 GB
- SSD livre: 20 GB
- Sistema operacional: Windows 10/11, macOS ou Linux 64-bit
- Internet: conexão estável para instalar dependências e autenticar com Microsoft

## Configuração recomendada de máquina

- CPU: 4 núcleos
- RAM: 8 GB
- SSD livre: 30 GB a 40 GB
- Sistema operacional: Windows 10/11, macOS ou Linux 64-bit
- Internet: conexão estável

## Softwares que precisam estar instalados

- Node.js 20 ou superior
- pnpm 11 ou superior
- Git
- SQL Server 2022 ou superior, se for rodar o banco localmente sem Docker
- Docker e Docker Compose, se quiser subir a aplicação em container
- Navegador moderno, como Chrome, Edge ou Firefox

## Observações

- O projeto usa autenticação Microsoft Entra ID, então o login depende de acesso à internet e configuração do tenant.
- Se você usar Docker, o projeto já sobe frontend, backend e SQL Server com os arquivos de compose do repositório.
