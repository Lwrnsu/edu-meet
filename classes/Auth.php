<?php
require_once __DIR__ . "/../config/db.php";

class Auth {
    private $conn;

    public function __construct() {
        global $conn;
        $this->conn = $conn;
    }

    // Returns associative array:
    // [user_id => 1, email => ..., password_hash => ..., first_name => ..., last_name => ..., is_active => 1]
    public function getUserByEmail($email) {
        $stmt = $this->conn->prepare(
            "SELECT user_id, email, password_hash, first_name, last_name, is_active
             FROM users WHERE email = ?"
        );
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();
        $user = $result->fetch_assoc();
        $stmt->close();
        return $user; // null if not found
    }

    // Returns just the ID, e.g. 1
    public function getUserID($email) {
        $user = $this->getUserByEmail($email);
        return $user ? $user["user_id"] : null;
    }
}
?>