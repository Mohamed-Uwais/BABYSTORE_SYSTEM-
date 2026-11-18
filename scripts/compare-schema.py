"""Compare MySQL SHOW CREATE TABLE output offline; never executes SQL."""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parent.parent

def normalise_index(line):
    line = re.sub(r'^CONSTRAINT `[^`]+` ', '', line)
    return re.sub(r'^(UNIQUE )?KEY `[^`]+`', lambda m: (m[1] or '')+'KEY', line)

def parse(text):
    tables = {}
    for match in re.finditer(r'CREATE TABLE `([^`]+)` \(\n(.*?)\n\)([^;]*);', text, re.S):
        name, body, options = match.groups()
        columns, indexes, constraints = {}, set(), set()
        options = re.sub(r'\s*AUTO_INCREMENT=\d+', '', options).strip()
        for line in body.splitlines():
            line = line.strip().rstrip(',')
            column = re.match(r'`([^`]+)` (.*)', line)
            if column:
                columns[column[1]] = column[2]
            elif re.match(r'(?:PRIMARY KEY|UNIQUE KEY|KEY|FULLTEXT KEY|SPATIAL KEY)', line):
                indexes.add(normalise_index(line))
            else:
                constraints.add(normalise_index(line))
        tables[name] = dict(columns=columns, indexes=sorted(indexes), constraints=sorted(constraints), options=options)
    expected = len(re.findall(r'CREATE TABLE\s', text))
    if not tables or len(tables) != expected:
        raise ValueError('Unrecognised table format; do not infer compatibility from a partial parse')
    return tables

def compare(live, staging):
    changes = {}
    for name in sorted(live.keys() & staging.keys()):
        a, b = live[name], staging[name]
        item = {
            'vps_only_columns': sorted(a['columns'].keys()-b['columns'].keys()),
            'staging_only_columns': sorted(b['columns'].keys()-a['columns'].keys()),
            'different_columns': {key:{'vps':a['columns'][key], 'staging':b['columns'][key]}
                for key in sorted(a['columns'].keys() & b['columns'].keys()) if a['columns'][key]!=b['columns'][key]},
            'vps_only_indexes': sorted(set(a['indexes'])-set(b['indexes'])),
            'staging_only_indexes': sorted(set(b['indexes'])-set(a['indexes'])),
            'vps_only_constraints': sorted(set(a['constraints'])-set(b['constraints'])),
            'staging_only_constraints': sorted(set(b['constraints'])-set(a['constraints'])),
            'table_options_differ': a['options'] != b['options'],
        }
        if any(item.values()): changes[name]=item
    return {'vps_only_tables': sorted(live.keys()-staging.keys()),
            'staging_only_tables': sorted(staging.keys()-live.keys()), 'changed_tables': changes}

if __name__ == '__main__':
    live=parse((ROOT/'.staging/imports/littora-schema-reviewed.sql').read_text(encoding='utf-8-sig'))
    staging=parse((ROOT/'.staging/staging-schema.sql').read_text(encoding='utf-8-sig'))
    result=compare(live, staging)
    (ROOT/'.staging/schema-differences.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    print('VPS-only tables:', ', '.join(result['vps_only_tables']))
    print('Staging-only tables:', ', '.join(result['staging_only_tables']))
    for name, item in result['changed_tables'].items():
        print(name, 'VPS-only columns:',','.join(item['vps_only_columns']) or 'none',
              '| staging-only:',','.join(item['staging_only_columns']) or 'none',
              '| changed definitions:',len(item['different_columns']),
              '| index differences:',len(item['vps_only_indexes'])+len(item['staging_only_indexes']),
              '| FK/check differences:',len(item['vps_only_constraints'])+len(item['staging_only_constraints']),
              '| table options differ:',item['table_options_differ'])
    print('Detailed private report: .staging/schema-differences.json. No SQL was executed.')
