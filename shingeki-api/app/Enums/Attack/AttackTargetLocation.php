<?php

namespace App\Enums\Attack;

enum AttackTargetLocation: string
{
    case Form = 'FORM';
    case QueryParameter = 'QUERY_PARAMETER';
    case Header = 'HEADER';
    case Cookie = 'COOKIE';
    case JsonBody = 'JSON_BODY';
    case UrlPath = 'URL_PATH';
    case FileUpload = 'FILE_UPLOAD';
    case ApiEndpoint = 'API_ENDPOINT';
    case SourceCode = 'SOURCE_CODE';
}
