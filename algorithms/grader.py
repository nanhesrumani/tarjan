import os
import json
import tempfile
import subprocess
from typing import Dict, Any

JAVA_HARNESS_TEMPLATE = r"""import java.util.*;

// __STUDENT_CODE__

public class Autograder {
    private static int passed = 0;
    private static int total = 0;
    private static List<Map<String, Object>> results = new ArrayList<>();

    private static void checkTest(String name, int n, int[][] edges, int[][] expectedEdges) {
        total++;
        Map<String, Object> t = new LinkedHashMap<>();
        t.put("name", name);
        t.put("n", n);
        
        List<List<Integer>> conns = new ArrayList<>();
        for (int[] e : edges) {
            conns.add(Arrays.asList(e[0], e[1]));
        }

        long start = System.currentTimeMillis();
        List<List<Integer>> actual = null;
        try {
            Solution sol = new Solution();
            actual = sol.criticalConnections(n, conns);
        } catch (Throwable ex) {
            t.put("status", "RUNTIME_ERROR");
            t.put("error", ex.getClass().getSimpleName() + ": " + (ex.getMessage() != null ? ex.getMessage() : "Exception"));
            t.put("expected", formatEdges(expectedEdges));
            t.put("actual", new ArrayList<String>());
            results.add(t);
            return;
        }
        long duration = System.currentTimeMillis() - start;
        t.put("durationMs", duration);

        Set<String> expSet = new HashSet<>();
        for (int[] e : expectedEdges) {
            int u = Math.min(e[0], e[1]);
            int v = Math.max(e[0], e[1]);
            expSet.add(u + "-" + v);
        }

        Set<String> actSet = new HashSet<>();
        if (actual != null) {
            for (List<Integer> e : actual) {
                if (e != null && e.size() >= 2) {
                    int u = Math.min(e.get(0), e.get(1));
                    int v = Math.max(e.get(0), e.get(1));
                    actSet.add(u + "-" + v);
                }
            }
        }

        List<String> expList = new ArrayList<>(expSet);
        Collections.sort(expList);
        List<String> actList = new ArrayList<>(actSet);
        Collections.sort(actList);

        t.put("expected", expList);
        t.put("actual", actList);

        if (expSet.equals(actSet)) {
            passed++;
            t.put("status", "PASS");
        } else {
            t.put("status", "FAIL");
        }
        results.add(t);
    }

    private static List<String> formatEdges(int[][] edges) {
        List<String> res = new ArrayList<>();
        for (int[] e : edges) {
            int u = Math.min(e[0], e[1]);
            int v = Math.max(e[0], e[1]);
            res.add(u + "-" + v);
        }
        Collections.sort(res);
        return res;
    }

    @SuppressWarnings("unchecked")
    public static void main(String[] args) {
        // Test 1: Simple Triangle with Spur Track
        checkTest("Test 1: Simple Triangle with Spur Track", 4, 
            new int[][]{{0,1},{1,2},{2,0},{1,3}}, 
            new int[][]{{1,3}});

        // Test 2: Two Loops with Choke Track
        checkTest("Test 2: Two Regional Loops with Choke Track", 6, 
            new int[][]{{0,1},{1,2},{2,0},{1,3},{3,4},{4,5},{5,3}}, 
            new int[][]{{1,3}});

        // Test 3: 16-Station National Transit Network
        checkTest("Test 3: 16-Station National Transit Network", 16,
            new int[][]{
                {0,1},{1,2},{2,3},{3,0},{0,2},
                {1,4},{4,5},
                {5,6},{6,7},{7,5},{7,8},
                {2,9},{9,10},{10,11},{11,9},
                {11,12},{12,13},
                {13,14},{14,15},{15,13}
            },
            new int[][]{{1,4},{4,5},{7,8},{2,9},{11,12},{12,13}});

        // Test 4: Pure Ring Railway Loop (0 Bridges)
        checkTest("Test 4: Pure Ring Railway Loop (0 Bridges)", 5,
            new int[][]{{0,1},{1,2},{2,3},{3,4},{4,0}},
            new int[][]{});

        // Test 5: Linear Rail Corridor (All Tracks Critical)
        checkTest("Test 5: Linear Rail Corridor (All Tracks Critical)", 4,
            new int[][]{{0,1},{1,2},{2,3}},
            new int[][]{{0,1},{1,2},{2,3}});

        StringBuilder sb = new StringBuilder();
        sb.append("{\"passed\":").append(passed)
          .append(",\"total\":").append(total)
          .append(",\"results\":[");
        for (int i = 0; i < results.size(); i++) {
            if (i > 0) sb.append(",");
            Map<String, Object> r = results.get(i);
            sb.append("{");
            sb.append("\"name\":\"").append(r.get("name")).append("\",");
            sb.append("\"n\":").append(r.get("n")).append(",");
            sb.append("\"status\":\"").append(r.get("status")).append("\",");
            if (r.containsKey("durationMs")) {
                sb.append("\"durationMs\":").append(r.get("durationMs")).append(",");
            }
            if (r.containsKey("error")) {
                sb.append("\"error\":\"").append(String.valueOf(r.get("error")).replace("\"", "\\\"")).append("\",");
            }
            sb.append("\"expected\":").append(toJsonList((List<String>)r.get("expected"))).append(",");
            sb.append("\"actual\":").append(toJsonList((List<String>)r.get("actual")));
            sb.append("}");
        }
        sb.append("]}");
        System.out.println("__GRADER_OUTPUT__");
        System.out.println(sb.toString());
    }

    private static String toJsonList(List<String> list) {
        if (list == null) return "[]";
        StringBuilder b = new StringBuilder("[");
        for (int i = 0; i < list.size(); i++) {
            if (i > 0) b.append(",");
            b.append("\"").append(list.get(i)).append("\"");
        }
        b.append("]");
        return b.toString();
    }
}
"""

def grade_java_solution(student_code: str) -> Dict[str, Any]:
    """
    Compiles and tests student's Solution class against automated test suite.
    """
    if not student_code or not student_code.strip():
        return {
            "success": False,
            "passed": 0,
            "total": 5,
            "compilation_error": "Error: Submitted code is empty. Please implement the criticalConnections method.",
            "results": []
        }

    # Ensure student code doesn't define conflicting public classes
    cleaned_code = student_code.replace("public class Solution", "class Solution")
    
    full_source = JAVA_HARNESS_TEMPLATE.replace("// __STUDENT_CODE__", cleaned_code)

    temp_dir = tempfile.mkdtemp()
    source_file = os.path.join(temp_dir, "Autograder.java")

    try:
        with open(source_file, "w", encoding="utf-8") as f:
            f.write(full_source)

        proc = subprocess.run(
            ["java", source_file],
            capture_output=True,
            text=True,
            timeout=8.0
        )

        stdout = proc.stdout
        stderr = proc.stderr

        if "__GRADER_OUTPUT__" in stdout:
            parts = stdout.split("__GRADER_OUTPUT__")
            json_text = parts[1].strip()
            data = json.loads(json_text)
            return {
                "success": True,
                "passed": data.get("passed", 0),
                "total": data.get("total", 5),
                "compilation_error": None,
                "results": data.get("results", [])
            }
        else:
            # Clean up line numbers from error output to be relative to student code
            clean_err = stderr.replace(source_file, "Solution.java")
            return {
                "success": False,
                "passed": 0,
                "total": 5,
                "compilation_error": clean_err.strip() or "Compilation or execution failed without output.",
                "results": []
            }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "passed": 0,
            "total": 5,
            "compilation_error": "Time Limit Exceeded: Execution took longer than 8.0 seconds. Check for infinite loops or deep unvisited recursion.",
            "results": []
        }
    except Exception as e:
        return {
            "success": False,
            "passed": 0,
            "total": 5,
            "compilation_error": f"Internal execution error: {str(e)}",
            "results": []
        }
    finally:
        try:
            if os.path.exists(source_file):
                os.remove(source_file)
            if os.path.exists(temp_dir):
                os.rmdir(temp_dir)
        except Exception:
            pass
