"use client";
import React, { useEffect, useState } from "react";
import { useToast } from "../components/ToastProvider";
import { Input, Button } from "../components/ui";

const CredentialSetupPage = () => {
  const [source, setSource] = useState({
    host: "",
    user: "",
    password: "",
    database: ""
  });
  const [destination, setDestination] = useState({
    host: "",
    user: "",
    password: "",
    database: ""
  });
  const toast = useToast();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("dbCredentials");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.source) setSource(parsed.source);
        if (parsed.destination) setDestination(parsed.destination);
      }
    } catch (e) {
      // ignore parse errors
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Send credentials to the server for temporary storage
    const response = await fetch("/api/store-credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, destination })
    });
    if (response.ok) {
      toast.show("Credentials saved", "success");
      try {
        localStorage.setItem(
          "dbCredentials",
          JSON.stringify({ source, destination })
        );
      } catch (e) {
        // ignore storage errors
      }
    } else {
      toast.show("Failed to save credentials", "error");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Credential Setup</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="card">
            <h2 className="text-lg font-semibold">Source Database</h2>
            <div className="form-row">
              <Input
                label="Host"
                type="text"
                placeholder="Host"
                value={source.host}
                onChange={(e) => setSource({ ...source, host: e.target.value })}
                className=""
              />
            </div>
            <div className="form-row">
              <Input
                label="User"
                type="text"
                placeholder="User"
                value={source.user}
                onChange={(e) => setSource({ ...source, user: e.target.value })}
              />
            </div>
            <div className="form-row">
              <Input
                label="Password"
                type="password"
                placeholder="Password"
                value={source.password}
                onChange={(e) => setSource({ ...source, password: e.target.value })}
              />
            </div>
            <div className="form-row">
              <Input
                label="Database"
                type="text"
                placeholder="Database"
                value={source.database}
                onChange={(e) => setSource({ ...source, database: e.target.value })}
              />
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold">Destination Database</h2>
            <div className="form-row">
              <Input
                label="Host"
                type="text"
                placeholder="Host"
                value={destination.host}
                onChange={(e) => setDestination({ ...destination, host: e.target.value })}
              />
            </div>
            <div className="form-row">
              <Input
                label="User"
                type="text"
                placeholder="User"
                value={destination.user}
                onChange={(e) => setDestination({ ...destination, user: e.target.value })}
              />
            </div>
            <div className="form-row">
              <Input
                label="Password"
                type="password"
                placeholder="Password"
                value={destination.password}
                onChange={(e) => setDestination({ ...destination, password: e.target.value })}
              />
            </div>
            <div className="form-row">
              <Input
                label="Database"
                type="text"
                placeholder="Database"
                value={destination.database}
                onChange={(e) => setDestination({ ...destination, database: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Button type="submit" className="btn-primary">
            Save Credentials
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CredentialSetupPage;
