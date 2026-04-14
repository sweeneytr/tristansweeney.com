package main

import (
	"context"
	"fmt"
	"net/http"

	"charm.land/bubbles/v2/spinner"
	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
)

type errMsg error

type model struct {
	server        *http.Server
	serveMux      *http.ServeMux
	spinner       spinner.Model
	serverRunning bool
	quitting      bool
	err           error
}

func initialModel(serveMux *http.ServeMux) model {
	s := spinner.New()
	s.Spinner = spinner.Dot
	s.Style = lipgloss.NewStyle().Foreground(lipgloss.Color("205"))
	return model{spinner: s, serveMux: serveMux}
}

func (m model) Init() tea.Cmd {
	return m.spinner.Tick
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyPressMsg:
		switch msg.String() {
		case "q", "esc", "ctrl+c":
			m.quitting = true
			return m, tea.Quit
		case "space":
			if !m.serverRunning {
				m.server = &http.Server{Addr: ":8080", Handler: m.serveMux}
				go func() {
					m.server.ListenAndServe()
				}()
			} else {
				m.server.Shutdown(context.TODO())
				m.server = nil
			}
			m.serverRunning = !m.serverRunning
			return m, m.spinner.Tick
		default:
			return m, nil
		}

	case errMsg:
		m.err = msg
		return m, nil

	default:
		var cmd tea.Cmd
		m.spinner, cmd = m.spinner.Update(msg)
		return m, cmd
	}
}

func (m model) View() tea.View {
	if m.err != nil {
		return tea.NewView(m.err.Error())
	}
	var serverMsg string
	if m.serverRunning {
		serverMsg = "online"
	} else {
		serverMsg = "offline"
	}

	str := fmt.Sprintf("\n\n   %s Loading forever...press q to quit\n Server %s press spacebar to start server\n\n", m.spinner.View(), serverMsg)
	if m.quitting {
		return tea.NewView(str + "\n")
	}
	return tea.NewView(str)
}
