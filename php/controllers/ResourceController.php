<?php
// Class resources API. Call as: /controllers/ResourceController.php?action=<action>
// All POST requests need the header  X-Requested-With: XMLHttpRequest
//
//   GET  list                            all resources + list of file types (for the filter)
//   POST upload  [faculty]   files[]     post one or more files
//   POST update  [faculty]   id, title, file (optional replacement)
//   POST delete  [faculty]   id
//   GET  download&id=[&view=1]           download / view in the browser

require_once __DIR__ . '/../services/Api.php';
require_once __DIR__ . '/../services/Auth.php';
require_once __DIR__ . '/../services/FileStorage.php';
require_once __DIR__ . '/../models/Resource.php';

class ResourceController {
    private Resource $resources;

    public function __construct() {
        $this->resources = new Resource();
    }

    public function list(): never {
        $me = Auth::user();
        $rows = array_map(fn($r) => $this->json($r), $this->resources->getAll());
        $types = array_values(array_unique(array_column($rows, 'type')));
        sort($types);
        Api::ok('Resources loaded.', ['resources' => $rows, 'types' => $types, 'rules' => FileStorage::rules(), 'viewer' => $me]);
    }

    public function upload(): never {
        $me = Auth::requireFaculty();
        $created = [];
        foreach (FileStorage::storeMany('files') as $f) {
            $id = $this->resources->create(pathinfo($f['name'], PATHINFO_FILENAME), $f['name'], $f['path'], $f['size'], $me['id']);
            $created[] = $this->json($this->resources->getById($id));
        }
        if (!$created) throw new InvalidArgumentException('Nothing was uploaded. Use pdf, docx, pptx, xlsx, png, jpg, txt or zip up to 30 MB each.');
        $n = count($created);
        Api::ok("$n file" . ($n > 1 ? 's' : '') . ' posted.', ['resources' => $created], 201);
    }

    public function update(): never {
        Auth::requireFaculty();
        $r = $this->find(Api::int('id'));
        $title = Api::str('title');
        if ($title === '') throw new InvalidArgumentException('File name is required.');

        $f = FileStorage::store('file');
        if ($f) {
            FileStorage::remove($r['file_path']);
            $this->resources->replaceFile($r['id'], $title, $f['name'], $f['path'], $f['size']);
        } else {
            $this->resources->rename($r['id'], $title);
        }
        Api::ok('Resource updated.', ['resource' => $this->json($this->resources->getById($r['id']))]);
    }

    public function delete(): never {
        Auth::requireFaculty();
        $r = $this->find(Api::int('id'));
        FileStorage::remove($r['file_path']);
        $this->resources->delete($r['id']);
        Api::ok('Resource deleted.');
    }

    public function download(): never {
        Auth::user();
        $r = $this->find(Api::int('id'));
        $name = $r['title'] . '.' . FileStorage::ext($r['file_name']);
        FileStorage::send($r['file_path'], $name, isset($_GET['view']));
    }

    private function find(int $id): array {
        $r = $this->resources->getById($id);
        if (!$r) throw new HttpError('Resource not found.', 404);
        return $r;
    }

    private function json(array $r): array {
        return [
            'id' => (int)$r['id'],
            'title' => $r['title'],
            'file_name' => $r['file_name'],
            'file_size' => (int)$r['file_size'],
            'type' => FileStorage::ext($r['file_name']),
            'viewable' => FileStorage::viewable($r['file_name']),
            'uploaded_by' => (int)$r['uploaded_by'],
            'uploader' => $r['uploader'] ?? null,
            'created_at' => $r['created_at'],
        ];
    }
}

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    Api::run(ResourceController::class, [
        'list'     => ['GET', 'list'],
        'upload'   => ['POST', 'upload'],
        'update'   => ['POST', 'update'],
        'delete'   => ['POST', 'delete'],
        'download' => ['GET', 'download'],
    ]);
}
