<?php

namespace App\Enums;

enum AttackCategory: string
{
    case SqlInjection = 'SQL_INJECTION';
    case Xss = 'XSS';
    case Csrf = 'CSRF';
    case CommandInjection = 'COMMAND_INJECTION';
    case PathTraversal = 'PATH_TRAVERSAL';
    case Ssrf = 'SSRF';
    case Xxe = 'XXE';
    case LdapInjection = 'LDAP_INJECTION';
    case NosqlInjection = 'NOSQL_INJECTION';
    case Idor = 'IDOR';
}
