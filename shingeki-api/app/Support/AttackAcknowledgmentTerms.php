<?php

namespace App\Support;

final class AttackAcknowledgmentTerms
{
    public const VERSION = '2026-07-13';

    public const RESPONSIBILITY_CODE = 'SHINGEKI-ATTACK-ACK-1';

    public static function title(): string
    {
        return 'Código de conduta para disparo de ataques';
    }

    /**
     * Texto completo exibido ao usuário. Ao alterar conteúdo, incremente VERSION
     * (e/ou RESPONSIBILITY_CODE) para exigir novo aceite.
     *
     * @return list<string>
     */
    public static function paragraphs(): array
    {
        return [
            'Antes de disparar testes DAST ou SAST, você declara que é responsável pelo sistema alvo e que possui autorização para executar esses testes.',
            'Ataques ou scans contra sistemas sem autorização são de sua responsabilidade exclusiva. O Shingeki registra o aceite para fins de auditoria.',
            'Ao marcar o aceite na plataforma, você confirma que leu este código de conduta e concorda com as declarações acima.',
        ];
    }

    /**
     * @return list<string>
     */
    public static function checklist(): array
    {
        return [
            'Declaro que sou responsável pelo alvo e tenho autorização para testar este sistema.',
            'Estou ciente de que ataques contra sistemas sem autorização são de minha responsabilidade exclusiva.',
        ];
    }

    /**
     * @return array{title: string, version: string, responsibility_code: string, paragraphs: list<string>, checklist: list<string>}
     */
    public static function payload(): array
    {
        return [
            'title' => self::title(),
            'version' => self::VERSION,
            'responsibility_code' => self::RESPONSIBILITY_CODE,
            'paragraphs' => self::paragraphs(),
            'checklist' => self::checklist(),
        ];
    }
}
