"""Build content/problems.json and (with --verify) compile + run every reference solution.

    python3 content/src/build.py            # write problems.json
    python3 content/src/build.py --verify   # also javac/java every approach against every test
"""
import importlib, json, os, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import common  # noqa: E402

MODULES = sorted(f[:-3] for f in os.listdir(HERE) if f.startswith("p_") and f.endswith(".py"))
for m in MODULES:
    importlib.import_module(m)

probs = common.PROBLEMS
slugs = [p["slug"] for p in probs]
assert len(slugs) == len(set(slugs)), "duplicate slugs"
for p in probs:
    for r in p["related"]:
        assert r in slugs, f"{p['slug']}: unknown related {r}"

out = os.path.join(HERE, "..", "problems.json")
with open(out, "w") as f:
    json.dump(probs, f, indent=1, ensure_ascii=False)
print(f"wrote {len(probs)} problems to {os.path.normpath(out)}")


def check(job):
    p, a = job
    d = tempfile.mkdtemp(prefix="am-")
    with open(os.path.join(d, "Main.java"), "w") as f:
        f.write(a["java"])
    c = subprocess.run(["javac", "-nowarn", "Main.java"], cwd=d, capture_output=True, text=True)
    if c.returncode != 0:
        return f"{p['slug']}/{a['kind']}: COMPILE\n{c.stderr[:800]}"
    errs = []
    for i, t in enumerate(p["tests"]):
        r = subprocess.run(["java", "-Xss64m", "-cp", d, "Main"], input=t["input"] + "\n", capture_output=True, text=True, timeout=20)
        got = "\n".join(l.rstrip() for l in r.stdout.strip().split("\n"))
        exp = "\n".join(l.rstrip() for l in t["expected"].strip().split("\n"))
        if got != exp:
            errs.append(f"{p['slug']}/{a['kind']} test {i}: expected {exp!r} got {got!r} {r.stderr[:300]}")
    return "\n".join(errs) or None


if "--verify" in sys.argv:
    only = [a for a in sys.argv[2:] if not a.startswith("--")]
    jobs = [(p, a) for p in probs if not only or p["slug"] in only for a in p["approaches"]]
    with ThreadPoolExecutor(4) as ex:
        res = [r for r in ex.map(check, jobs) if r]
    print("\n".join(res))
    print(f"verified {len(jobs)} solutions, {len(res)} failing")
    sys.exit(1 if res else 0)
